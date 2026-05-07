// scripts/migrate-from-wanlian.mjs
// 从 wanlian MySQL 迁移部门/用户数据到 Supabase
//
// 用法:
//   node scripts/migrate-from-wanlian.mjs
//
// 环境变量:
//   WANLIAN_HOST - MySQL 主机
//   WANLIAN_PORT - MySQL 端口 (默认 3306)
//   WANLIAN_USER - MySQL 用户名
//   WANLIAN_PASSWORD - MySQL 密码
//   WANLIAN_DATABASE - MySQL 数据库名
//   SUPABASE_URL - Supabase 实例 URL
//   SUPABASE_SERVICE_ROLE_KEY - Supabase 服务角色密钥

import { createClient } from '@supabase/supabase-js';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { pinyin } from 'pinyin-pro';

dotenv.config();

// ====== 配置检查 ======
const wanlianHost = process.env.WANLIAN_HOST;
const wanlianPort = process.env.WANLIAN_PORT || '3306';
const wanlianUser = process.env.WANLIAN_USER;
const wanlianPassword = process.env.WANLIAN_PASSWORD;
const wanlianDatabase = process.env.WANLIAN_DATABASE;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!wanlianHost || !wanlianUser || !wanlianPassword || !wanlianDatabase) {
  console.error('错误: 缺少 MySQL 连接参数。请设置以下环境变量:');
  console.error('  WANLIAN_HOST, WANLIAN_USER, WANLIAN_PASSWORD, WANLIAN_DATABASE');
  process.exit(1);
}
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('错误: 缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const DEFAULT_PASSWORD = '888888';

// ====== 主流程 ======
async function migrate() {
  console.log('=============================================');
  console.log('  wanlian 数据迁移到 AI星销售');
  console.log('=============================================\n');

  let connection;
  try {
    // 连接 MySQL
    console.log('正在连接 wanlian MySQL...');
    connection = await mysql.createConnection({
      host: wanlianHost,
      port: parseInt(wanlianPort),
      user: wanlianUser,
      password: wanlianPassword,
      database: wanlianDatabase,
    });
    console.log('MySQL 连接成功。\n');

    // === 第一步: 迁移部门 ===
    console.log('--- 第一步: 迁移部门 ---');
    const [departments] = await connection.execute(
      'SELECT id, pid, name, type, director_id, create_time, update_time FROM gyx_auth_section WHERE is_del = 0'
    );

    let deptCount = 0;
    let deptSkipCount = 0;

    for (const dept of departments) {
      // 检查是否已迁移
      const { data: existing } = await supabase
        .from('departments')
        .select('id')
        .eq('legacy_wanlian_id', dept.id)
        .maybeSingle();

      if (existing) {
        deptSkipCount++;
        continue;
      }

      const deptId = `dept-${dept.id}`;
      const parentId = dept.pid && dept.pid !== 0 ? `dept-${dept.pid}` : null;

      const { error } = await supabase.from('departments').insert({
        id: deptId,
        name: dept.name,
        parent_id: parentId,
        type: dept.type || 0,
        legacy_wanlian_id: dept.id,
        roles: [],
        role_members: {},
        sub_departments: [],
        okrs: {},
        reviews: {},
      });

      if (error) {
        console.error(`  部门 "${dept.name}" (ID: ${dept.id}) 迁移失败: ${error.message}`);
      } else {
        deptCount++;
        console.log(`  部门 "${dept.name}" 迁移成功 -> ${deptId}`);
      }
    }
    console.log(`部门迁移完成: 新增 ${deptCount}, 跳过 ${deptSkipCount}\n`);

    // === 第二步: 迁移用户 ===
    console.log('--- 第二步: 迁移用户 ---');
    const [staffs] = await connection.execute(
      `SELECT s.id, s.name, s.english_name, s.phone, s.branch_id, s.role_id, s.status, r.name as role_name
       FROM gyx_erp_staff s
       LEFT JOIN gyx_auth_role r ON s.role_id = r.id
       WHERE s.is_del = 0`
    );

    let userCount = 0;
    let userSkipCount = 0;
    let userFailCount = 0;

    for (const staff of staffs) {
      // 检查是否已迁移
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('legacy_wanlian_id', staff.id)
        .maybeSingle();

      if (existing) {
        userSkipCount++;
        continue;
      }

      const username = staff.english_name
        ? staff.english_name.toLowerCase().replace(/\s+/g, '_')
        : pinyin(staff.name, { toneType: 'none', type: 'string' }).replace(/\s+/g, '');
      const email = `${username}@app.local`.toLowerCase();
      const departmentId = staff.branch_id ? `dept-${staff.branch_id}` : null;
      const role = staff.role_name === '管理员' ? 'Admin' : 'User';

      try {
        // 在 Supabase Auth 中创建用户
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          password: DEFAULT_PASSWORD,
          email_confirm: true,
          user_metadata: {
            name: staff.name,
            username,
            role,
            legacy_wanlian_id: staff.id,
          }
        });

        if (authError) {
          console.error(`  用户 "${staff.name}" Auth 创建失败: ${authError.message}`);
          userFailCount++;
          continue;
        }

        const authId = authData.user.id;
        const userId = `user-migrated-${staff.id}`;

        // 写入 public.users
        const { error: insertError } = await supabase.from('users').insert({
          id: userId,
          auth_id: authId,
          username,
          name: staff.name,
          email,
          phone: staff.phone || null,
          english_name: staff.english_name || null,
          employee_no: String(staff.id),
          role,
          department_id: departmentId,
          is_active: staff.status === 1,
          legacy_wanlian_id: staff.id,
          pad_permissions: [],
          reviews: {},
          system_role_ids: null,
          custom_permissions: null,
        });

        if (insertError) {
          console.error(`  用户 "${staff.name}" 业务表写入失败: ${insertError.message}`);
          await supabase.auth.admin.deleteUser(authId);
          userFailCount++;
          continue;
        }

        console.log(`  用户 "${staff.name}" 迁移成功 (${email})`);
        userCount++;
      } catch (err) {
        console.error(`  用户 "${staff.name}" 迁移异常: ${err.message}`);
        userFailCount++;
      }
    }

    console.log(`\n用户迁移完成: 成功 ${userCount}, 跳过 ${userSkipCount}, 失败 ${userFailCount}`);

    // === 汇总 ===
    console.log('\n=============================================');
    console.log('  迁移汇总');
    console.log('=============================================');
    console.log(`  部门: 新增 ${deptCount}, 跳过 ${deptSkipCount}`);
    console.log(`  用户: 成功 ${userCount}, 跳过 ${userSkipCount}, 失败 ${userFailCount}`);
    console.log(`  默认密码: ${DEFAULT_PASSWORD}`);
    console.log('=============================================');

  } catch (err) {
    console.error('迁移过程发生错误:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
