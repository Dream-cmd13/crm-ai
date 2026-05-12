#!/usr/bin/env python3
"""
Supabase 数据迁移脚本: 从 Supabase A (有数据) 复制所有 CRM-WeChat 表到 Supabase B (空库).

用法一: 使用 PostgreSQL 连接字符串 (推荐)
  1. 获取连接字符串:
     Supabase Cloud → Dashboard → Project Settings → Database → Connection string
     自建 Supabase → 自行获取 postgres 连接信息

  2. 运行:
     set SOURCE_DATABASE_URL=postgresql://postgres:PASS@db.xxx.supabase.co:5432/postgres
     set TARGET_DATABASE_URL=postgresql://postgres:PASS@db.yyy.supabase.co:5432/postgres
     python migrate_supabase.py --dry-run    # 试运行
     python migrate_supabase.py              # 执行迁移

用法二: 使用 Supabase 项目 URL + 数据库密码
  需要提供 Supabase 项目 URL 和数据库密码 (不是 service_role key):
     python migrate_supabase.py \
       --source-url https://xxx.supabase.co --source-db-pass PASSWORD_A \
       --target-url https://yyy.supabase.co --target-db-pass PASSWORD_B

  数据库密码在 Supabase Dashboard → Project Settings → Database 页面获取.

用法三: 混合使用
  python migrate_supabase.py \
    --source postgresql://... \
    --target-url https://yyy.supabase.co --target-db-pass PASSWORD_B

依赖: pip install psycopg2-binary
"""

import argparse
import os
import re
import sys
import textwrap
import time

try:
    import psycopg2
    from psycopg2 import sql
    from psycopg2.extras import execute_values
except ImportError:
    print("请先安装 psycopg2: pip install psycopg2-binary")
    sys.exit(1)


SCHEMA_SQL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "schema.sql")

# ============================================================================
# 表迁移配置 — 按外键依赖顺序排列 (无依赖→有依赖)
# ============================================================================
# (schema, table, pk_columns, identity_kind)
#   identity_kind: "bigserial" = bigserial PK, 显式插入ID, 需重置序列
#                  "generated" = GENERATED ALWAYS AS IDENTITY, 需 OVERRIDING SYSTEM VALUE + 重置序列
#                  None         = 无自增主键 (复合PK或文本PK)

MIGRATION_TABLES = [
    # ===== Level 0: 无外键依赖 =====
    ("wechat_raw", "wechat_callback_raw",            ["id"],                        "bigserial"),
    ("wechat_raw", "wework_callback_raw",            ["id"],                        "bigserial"),
    ("wechat_raw", "wework_group_message_events",    ["id"],                        "bigserial"),
    ("wechat_raw", "wework_private_message_events",  ["id"],                        "bigserial"),
    ("wechat_raw", "wechat_group_message_events",    ["id"],                        "bigserial"),
    ("wechat_raw", "wechat_private_message_events",  ["id"],                        "bigserial"),
    ("wechat_raw", "wechat_other_events",            ["id"],                        "bigserial"),
    ("wechat_raw", "wework_other_events",            ["id"],                        "bigserial"),
    ("wechat_raw", "cdn_runtime_state",              ["id"],                        "generated"),
    ("wechat_raw", "wechat_sync_state",              ["guid"],                      None),
    ("wechat_raw", "wechat_contacts",                ["guid", "username"],          None),
    ("wechat_raw", "wechat_chatrooms",               ["guid", "room_username"],     None),
    ("wechat_raw", "wechat_chatroom_members",        ["guid", "room_username", "username"], None),
    ("public",     "crm_wechat_binding",             ["id"],                        "generated"),
    ("public",     "crm_wechat_name_snapshot",       ["id"],                        "generated"),
    ("public",     "crm_wechat_unresolved_nickname", ["id"],                        "generated"),

    # ===== Level 1: FK→wechat_contacts / wechat_chatrooms / level0 tables =====
    ("wechat_raw", "message_media_jobs",             ["id"],                        "generated"),
    ("wechat_raw", "wechat_contact_sync_jobs",       ["id"],                        "generated"),
    ("public",     "crm_wx_conversation",            ["id"],                        "generated"),
    ("public",     "crm_customer_message_session",   ["id"],                        None),

    # ===== Level 2: FK→crm_wx_conversation / message_media_jobs / crm_customer_message_session =====
    ("wechat_raw", "message_media_results",          ["id"],                        "generated"),
    ("public",     "crm_wx_message",                 ["id"],                        "generated"),
    ("public",     "crm_wx_conversation_member",     ["id"],                        "generated"),
    ("public",     "crm_wx_projection_jobs",         ["id"],                        "generated"),

    # ===== Level 3: FK→crm_customer_message_session + crm_wx_message =====
    ("public",     "crm_customer_message_session_item", ["id"],                     "generated"),
]

ALL_TABLES = [f"{s}.{t}" for s, t, _, _ in MIGRATION_TABLES]


# ============================================================================
# 连接字符串解析
# ============================================================================

def supabase_url_to_db_host(project_url: str) -> str:
    """从 Supabase 项目 URL 推导数据库主机名."""
    # https://xxx.supabase.co → db.xxx.supabase.co
    # https://mudyunyuvccdxgfnmmxg.supabase.co → db.mudyunyuvccdxgfnmmxg.supabase.co
    m = re.match(r"https?://([^.]+)\.supabase\.(?:co|com)", project_url)
    if m:
        return f"db.{m.group(1)}.supabase.co"
    # 自建实例: http://47.115.252.150 → 直连 47.115.252.150
    m = re.match(r"https?://([^/:]+)", project_url)
    if m:
        return m.group(1)
    raise ValueError(f"无法从 URL 提取数据库主机: {project_url}")


def build_conn_string(*, url: str | None = None, db_pass: str | None = None,
                      conn_string: str | None = None) -> str:
    """构建 PostgreSQL 连接字符串.

    支持三种输入:
    1. 直接提供 postgresql:// 连接字符串
    2. 提供 Supabase 项目 URL + 数据库密码
    3. 从环境变量 SOURCE_DATABASE_URL / TARGET_DATABASE_URL 读取
    """
    # 优先使用连接字符串
    if conn_string:
        cs = conn_string.strip().strip('"').strip("'")
        if cs.startswith("postgresql://") or cs.startswith("postgres://"):
            return cs
        # 可能是仅密码 (与 url 配合)
        if cs and not cs.startswith("http"):
            db_pass = cs
            conn_string = None

    if conn_string and (conn_string.startswith("http://") or conn_string.startswith("https://")):
        url = conn_string

    # 从 Supabase URL + 密码构建
    if url and db_pass:
        url = url.strip().strip('"').strip("'")
        db_pass = db_pass.strip().strip('"').strip("'")
        host = supabase_url_to_db_host(url)
        # 使用连接池端口 6543 (更稳定)
        conn_str = f"postgresql://postgres:{db_pass}@{host}:5432/postgres"
        return conn_str

    # 只有 URL 没有密码
    if url and not db_pass:
        print(f"\n错误: 提供了 Supabase URL 但缺少数据库密码.")
        print(f"  URL: {url}")
        print(f"  请在 Supabase Dashboard → Project Settings → Database 获取密码.")
        print(f"  然后使用 --source-db-pass 或 --target-db-pass 参数传入.")
        sys.exit(1)

    # 只有密码没有 URL
    if db_pass and not url:
        print(f"\n错误: 提供了数据库密码但缺少 Supabase URL.")
        print(f"  请使用 --source-url 或 --target-url 参数传入.")
        sys.exit(1)

    print(f"\n错误: 无法构建数据库连接字符串. 请提供:")
    print(f"  1) --source / --target (postgresql:// 连接字符串), 或")
    print(f"  2) --source-url / --target-url (Supabase 项目 URL) + --source-db-pass / --target-db-pass")
    sys.exit(1)


def parse_conn_string(conn_str: str) -> dict:
    """解析 PostgreSQL 连接字符串."""
    pattern = (
        r"postgres(?:ql)?://"
        r"(?P<user>[^:]+)"
        r":(?P<password>[^@]+)"
        r"@(?P<host>[^:]+)"
        r":(?P<port>\d+)"
        r"/(?P<dbname>.+)"
    )
    m = re.match(pattern, conn_str)
    if not m:
        print(f"错误: 无法解析连接字符串: {conn_str}")
        sys.exit(1)
    return {
        "host": m.group("host"),
        "port": int(m.group("port")),
        "user": m.group("user"),
        "password": m.group("password"),
        "dbname": m.group("dbname"),
    }


def get_conn(conn_str: str):
    """创建数据库连接."""
    info = parse_conn_string(conn_str)
    return psycopg2.connect(**info)


# ============================================================================
# 数据库工具函数
# ============================================================================

def get_column_names(cursor, schema: str, table: str) -> list:
    """按 ordinal_position 获取所有列名."""
    cursor.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = %s AND table_name = %s
        ORDER BY ordinal_position
    """, (schema, table))
    return [row[0] for row in cursor.fetchall()]


def table_exists(cursor, schema: str, table: str) -> bool:
    """检查表是否存在."""
    cursor.execute("""
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = %s AND table_name = %s
        )
    """, (schema, table))
    return cursor.fetchone()[0]


def get_table_count(cursor, schema: str, table: str) -> int:
    """获取表行数."""
    cursor.execute(
        sql.SQL("SELECT count(*) FROM {}.{}").format(
            sql.Identifier(schema), sql.Identifier(table)))
    return cursor.fetchone()[0]


def get_sequence_name(cursor, schema: str, table: str) -> str | None:
    """获取 bigserial 列的序列名."""
    cursor.execute("""
        SELECT pg_get_serial_sequence(%s, column_name)
        FROM information_schema.columns
        WHERE table_schema = %s
          AND table_name = %s
          AND column_default LIKE 'nextval%%'
        LIMIT 1
    """, (f"{schema}.{table}", schema, table))
    row = cursor.fetchone()
    return row[0] if row and row[0] else None


def get_identity_sequence(cursor, schema: str, table: str) -> str | None:
    """获取 GENERATED ALWAYS AS IDENTITY 列的序列名."""
    cursor.execute("""
        SELECT pg_get_serial_sequence(%s, column_name)
        FROM information_schema.columns
        WHERE table_schema = %s
          AND table_name = %s
          AND is_identity = 'YES'
        LIMIT 1
    """, (f"{schema}.{table}", schema, table))
    row = cursor.fetchone()
    return row[0] if row and row[0] else None


# ============================================================================
# Schema 建表
# ============================================================================

def run_schema_sql(conn, dry_run: bool = False):
    """在目标库执行 schema.sql 建表."""
    if dry_run:
        print("[DRY RUN] 跳过 schema.sql 执行")
        return

    if not os.path.exists(SCHEMA_SQL_PATH):
        print(f"警告: schema.sql 不存在: {SCHEMA_SQL_PATH}")
        return

    with open(SCHEMA_SQL_PATH, "r", encoding="utf-8") as f:
        ddl = f.read()

    statements = []
    for stmt in ddl.split(";"):
        stripped = stmt.strip()
        if stripped:
            statements.append(stripped)

    print(f"执行 schema.sql ({len(statements)} 条语句)...")
    cursor = conn.cursor()
    ok = fail = 0
    for i, stmt in enumerate(statements):
        try:
            cursor.execute(stmt)
            ok += 1
        except Exception as e:
            fail += 1
            preview = stmt[:120].replace("\n", " ")
            print(f"  [警告] #{i+1} 失败: {e}")
            print(f"         SQL: {preview}...")
            conn.rollback()
            cursor = conn.cursor()
    conn.commit()
    cursor.close()
    print(f"schema.sql 执行完毕: {ok} 成功, {fail} 跳过/失败")


# ============================================================================
# 数据复制
# ============================================================================

def copy_table_data(src_conn, tgt_conn, schema: str, table: str,
                    pk_cols: list, identity_kind: str | None,
                    truncate: bool = True, dry_run: bool = False,
                    batch_size: int = 5000):
    """从源库复制单表数据到目标库."""

    src_cur = src_conn.cursor()
    tgt_cur = tgt_conn.cursor()
    qualified = f"{schema}.{table}"

    # 检查源表是否存在
    if not table_exists(src_cur, schema, table):
        print(f"  {qualified}: 源表不存在, 跳过")
        src_cur.close()
        tgt_cur.close()
        return 0

    # 获取列 (取交集)
    src_cols = get_column_names(src_cur, schema, table)
    tgt_cols = get_column_names(tgt_cur, schema, table)

    if not src_cols:
        print(f"  {qualified}: 源表无列, 跳过")
        src_cur.close()
        tgt_cur.close()
        return 0
    if not tgt_cols:
        print(f"  {qualified}: 目标表不存在 (请先执行 schema.sql), 跳过")
        src_cur.close()
        tgt_cur.close()
        return 0

    cols = [c for c in src_cols if c in tgt_cols]
    skipped = set(src_cols) - set(tgt_cols)
    if skipped:
        print(f"  {qualified}: 目标缺少列 {skipped}, 将跳过这些列")

    src_count = get_table_count(src_cur, schema, table)

    if dry_run:
        print(f"  {qualified}: {src_count:,} 行 → 将复制 {len(cols)} 个列")
        src_cur.close()
        tgt_cur.close()
        return src_count

    print(f"  {qualified}: {src_count:,} 行 → ", end="", flush=True)

    # TRUNCATE 目标表
    if truncate and src_count > 0:
        try:
            tgt_cur.execute(
                sql.SQL("TRUNCATE {} RESTART IDENTITY CASCADE").format(
                    sql.SQL("{}.{}").format(
                        sql.Identifier(schema), sql.Identifier(table)))
            )
        except Exception as e:
            tgt_conn.rollback()
            print(f"\n    TRUNCATE 失败: {e}")
            src_cur.close()
            tgt_cur.close()
            return 0

    if src_count == 0:
        print("0 行 (空表)")
        tgt_conn.commit()
        src_cur.close()
        tgt_cur.close()
        return 0

    # 构建列标识符
    col_idents = sql.SQL(", ").join([sql.Identifier(c) for c in cols])
    table_ident = sql.SQL("{}.{}").format(
        sql.Identifier(schema), sql.Identifier(table))

    # 构建 INSERT 模板
    if identity_kind == "generated":
        insert_tmpl = "INSERT INTO {}.{} ({}) OVERRIDING SYSTEM VALUE VALUES %s"
    elif identity_kind == "bigserial":
        insert_tmpl = "INSERT INTO {}.{} ({}) VALUES %s"
    else:
        insert_tmpl = "INSERT INTO {}.{} ({}) VALUES %s ON CONFLICT DO NOTHING"

    insert_sql = insert_tmpl.format(
        sql.Identifier(schema).as_string(tgt_cur),
        sql.Identifier(table).as_string(tgt_cur),
        col_idents.as_string(tgt_cur),
    )

    # 排序键
    order_cols = pk_cols if pk_cols else cols[:1]
    order_sql = sql.SQL(", ").join([sql.Identifier(c) for c in order_cols])

    select_sql = sql.SQL("SELECT {} FROM {} ORDER BY {} LIMIT %s OFFSET %s").format(
        col_idents, table_ident, order_sql)

    # 分批复制
    copy_start = time.time()
    total_copied = 0
    offset = 0

    while True:
        src_cur.execute(select_sql, (batch_size, offset))
        batch = src_cur.fetchall()
        if not batch:
            break

        try:
            execute_values(tgt_cur, insert_sql, batch, page_size=batch_size)
        except Exception as e:
            print(f"\n    批次插入失败 (offset={offset}, size={len(batch)}): {e}")
            tgt_conn.rollback()
            src_cur.close()
            tgt_cur.close()
            return total_copied

        total_copied += len(batch)
        offset += batch_size

        pct = min(total_copied / src_count * 100, 100)
        print(f"\r  {qualified}: {src_count:,} 行 → {total_copied:,} ({pct:.0f}%)",
              end="", flush=True)

    tgt_conn.commit()

    # 重置序列/identity (bigserial + generated 都需要)
    if identity_kind == "bigserial":
        seq_name = get_sequence_name(tgt_cur, schema, table)
    elif identity_kind == "generated":
        seq_name = get_identity_sequence(tgt_cur, schema, table)
    else:
        seq_name = None

    if seq_name:
        tgt_cur.execute(
            sql.SQL("SELECT setval(%s, COALESCE((SELECT max({}) FROM {}), 1))").format(
                sql.Identifier(pk_cols[0]), table_ident),
            (seq_name,))
        tgt_conn.commit()

    elapsed = time.time() - copy_start
    rate = int(total_copied / elapsed) if elapsed > 0 else 0
    print(f"\r  {qualified}: {total_copied:,} / {src_count:,} 行 ✓ "
          f"({elapsed:.1f}s, ~{rate:,} rows/s)")

    src_cur.close()
    tgt_cur.close()
    return total_copied


def reset_all_sequences(conn):
    """重置所有自增列的序列值 (bigserial + identity)."""
    cursor = conn.cursor()
    for schema, table, pk_cols, identity_kind in MIGRATION_TABLES:
        if identity_kind in ("bigserial", "generated"):
            if identity_kind == "bigserial":
                seq_name = get_sequence_name(cursor, schema, table)
            else:
                seq_name = get_identity_sequence(cursor, schema, table)

            if seq_name:
                cursor.execute(
                    sql.SQL("SELECT setval(%s, COALESCE((SELECT max({}) FROM {}.{}), 1))").format(
                        sql.Identifier(pk_cols[0]),
                        sql.Identifier(schema),
                        sql.Identifier(table)),
                    (seq_name,))
    conn.commit()
    cursor.close()


# ============================================================================
# 主入口
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="从 Supabase A 迁移数据到 Supabase B (CRM-WeChat 全部表)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""\
            示例:
              # 方式1: 使用连接字符串
              python migrate_supabase.py --source postgresql://... --target postgresql://...

              # 方式2: 使用 Supabase URL + 数据库密码
              python migrate_supabase.py \\
                --source-url https://xxx.supabase.co --source-db-pass PASS_A \\
                --target-url https://yyy.supabase.co --target-db-pass PASS_B

              # 试运行
              python migrate_supabase.py --source ... --target ... --dry-run

              # 只迁移一张表
              python migrate_supabase.py --source ... --target ... --table wechat_raw.wechat_contacts
            """),
    )

    # 连接参数
    conn_group = parser.add_argument_group("数据库连接")
    conn_group.add_argument("--source", "-s",
                            help="源 PostgreSQL 连接字符串 (postgresql://...)")
    conn_group.add_argument("--target", "-t",
                            help="目标 PostgreSQL 连接字符串 (postgresql://...)")
    conn_group.add_argument("--source-url",
                            help="源 Supabase 项目 URL (如 https://xxx.supabase.co)")
    conn_group.add_argument("--target-url",
                            help="目标 Supabase 项目 URL")
    conn_group.add_argument("--source-db-pass",
                            help="源数据库密码 (配合 --source-url 使用)")
    conn_group.add_argument("--target-db-pass",
                            help="目标数据库密码 (配合 --target-url 使用)")

    # 运行参数
    run_group = parser.add_argument_group("运行选项")
    run_group.add_argument("--dry-run", "-n", action="store_true",
                           help="试运行: 只检查连通性和行数, 不修改数据")
    run_group.add_argument("--skip-schema", action="store_true",
                           help="跳过建表步骤 (目标库已有表结构)")
    run_group.add_argument("--no-truncate", action="store_true",
                           help="不 TRUNCATE 目标表 (增量追加模式)")
    run_group.add_argument("--table",
                           help="只迁移指定表 (如 wechat_raw.wechat_contacts)")
    run_group.add_argument("--batch-size", type=int, default=5000,
                           help="每批插入行数 (默认 5000)")
    run_group.add_argument("--list-tables", action="store_true",
                           help="列出所有待迁移表并退出")

    args = parser.parse_args()

    if args.list_tables:
        print("待迁移表 (按外键依赖顺序):")
        for i, (s, t, pk, ik) in enumerate(MIGRATION_TABLES, 1):
            pk_str = ", ".join(pk)
            print(f"  {i:2d}. {s}.{t}  (PK: {pk_str}, ID: {ik})")
        return

    # 构建连接字符串
    source_cs = build_conn_string(
        conn_string=args.source or os.environ.get("SOURCE_DATABASE_URL"),
        url=args.source_url or os.environ.get("SOURCE_SUPABASE_URL"),
        db_pass=args.source_db_pass or os.environ.get("SOURCE_DB_PASSWORD"),
    )
    target_cs = build_conn_string(
        conn_string=args.target or os.environ.get("TARGET_DATABASE_URL"),
        url=args.target_url or os.environ.get("TARGET_SUPABASE_URL"),
        db_pass=args.target_db_pass or os.environ.get("TARGET_DB_PASSWORD"),
    )

    mode = "DRY RUN" if args.dry_run else "MIGRATION"
    print("=" * 60)
    print(f"  CRM-WeChat 数据迁移 — {mode}")
    print("=" * 60)

    # 连接源库
    print("\n连接源数据库...")
    try:
        src_conn = get_conn(source_cs)
        src_conn.set_session(autocommit=False)
        print("  源数据库连接成功 ✓")
    except Exception as e:
        print(f"  源数据库连接失败: {e}")
        sys.exit(1)

    # 连接目标库
    print("连接目标数据库...")
    try:
        tgt_conn = get_conn(target_cs)
        tgt_conn.set_session(autocommit=False)
        print("  目标数据库连接成功 ✓")
    except Exception as e:
        print(f"  目标数据库连接失败: {e}")
        src_conn.close()
        sys.exit(1)

    try:
        # ================================================================
        # Step 1: 建表
        # ================================================================
        if not args.skip_schema and not args.dry_run:
            print(f"\n{'='*60}")
            print("Step 1/3: 在目标库执行 schema.sql ...")
            print("=" * 60)
            run_schema_sql(tgt_conn)

        # ================================================================
        # Step 2: 复制数据
        # ================================================================
        print(f"\n{'='*60}")
        step = "2/3" if not args.dry_run else "1/2"
        print(f"Step {step}: 逐表复制数据 ...")
        print("=" * 60)

        tables_to_migrate = MIGRATION_TABLES
        if args.table:
            tables_to_migrate = [
                t for t in MIGRATION_TABLES
                if f"{t[0]}.{t[1]}" == args.table
            ]
            if not tables_to_migrate:
                print(f"未找到表: {args.table}")
                print(f"可用: {', '.join(ALL_TABLES)}")
                sys.exit(1)

        totals = {"rows": 0, "tables": 0, "skipped": 0}
        for schema, table, pk_cols, identity_kind in tables_to_migrate:
            n = copy_table_data(
                src_conn, tgt_conn,
                schema, table, pk_cols, identity_kind,
                truncate=not args.no_truncate,
                dry_run=args.dry_run,
                batch_size=args.batch_size,
            )
            if n > 0:
                totals["tables"] += 1
                totals["rows"] += n
            elif n == 0 and not args.dry_run:
                totals["skipped"] += 1

        # ================================================================
        # Step 3: 重置序列
        # ================================================================
        if not args.dry_run:
            print(f"\n{'='*60}")
            print("Step 3/3: 重置所有序列 ...")
            print("=" * 60)
            reset_all_sequences(tgt_conn)
            print("序列重置完毕 ✓")

        print(f"\n{'='*60}")
        if args.dry_run:
            print(f"  DRY RUN 完成! 源库共 {totals['rows']:,} 行")
        else:
            print(f"  迁移完成! {totals['tables']} 张表, 共 {totals['rows']:,} 行")
        print("=" * 60)

    finally:
        src_conn.close()
        tgt_conn.close()


if __name__ == "__main__":
    main()
