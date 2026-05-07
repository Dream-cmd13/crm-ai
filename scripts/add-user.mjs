// scripts/add-user.mjs
// 在 Supabase Auth + public.users 中创建新用户
// 用法: node scripts/add-user.mjs
// 依赖 env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { pinyin } from 'pinyin-pro';

dotenv.config();
dotenv.config({ path: '.env.local', override: false });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('错误: 缺少 SUPABASE_URL 环境变量。请在 .env 或 .env.local 中设置 VITE_SUPABASE_URL。');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.log('未检测到 SUPABASE_SERVICE_ROLE_KEY 环境变量。');
  console.log('请在 Supabase Dashboard → Project Settings → API → 获取 service_role key。');
  const rlTemp = readline.createInterface({ input, output });
  supabaseServiceKey = await rlTemp.question('请输入 Service Role Key: ');
  rlTemp.close();
  if (!supabaseServiceKey) {
    console.error('错误: 未提供 Service Role Key。');
    process.exit(1);
  }
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const rl = readline.createInterface({ input, output });

async function addUser() {
  console.log('=============================================');
  console.log('  AI星销售 新增用户配置向导');
  console.log('=============================================\n');

  try {
    // 1. 获取中文名称并转换为拼音
    const name = await rl.question('请输入用户中文名称 (例如: 张三): ');
    if (!name.trim()) throw new Error('名称不能为空');

    const username = pinyin(name, { toneType: 'none', type: 'string' }).replace(/\s+/g, '');
    console.log(`  自动生成用户名 (username): ${username}`);

    // 2. 工号
    const employeeNo = await rl.question('请输入工号 (留空跳过): ') || '';

    // 3. 手机号
    const phone = await rl.question('请输入手机号 (留空跳过): ') || '';

    // 4. 英文名
    const englishName = await rl.question('请输入英文名 (留空跳过): ') || '';

    // 5. 获取并验证部门
    console.log('\n正在获取部门列表...');
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('id, name');

    if (deptError) throw new Error(`获取部门失败: ${deptError.message}`);

    if (!departments || departments.length === 0) {
      console.log('当前没有部门数据，将跳过部门分配。');
    }

    let departmentId = null;
    let departmentName = '';

    if (departments && departments.length > 0) {
      console.log('可用部门列表:');
      departments.forEach((d, index) => {
        console.log(`   [${index + 1}] ${d.name}`);
      });

      const deptInput = await rl.question(`\n请输入部门编号(1-${departments.length}) 或 直接输入部门全称: `);

      const deptIndex = parseInt(deptInput) - 1;
      if (!isNaN(deptIndex) && departments[deptIndex]) {
        departmentId = departments[deptIndex].id;
        departmentName = departments[deptIndex].name;
      } else {
        const matchedDept = departments.find(d => d.name === deptInput.trim());
        if (matchedDept) {
          departmentId = matchedDept.id;
          departmentName = matchedDept.name;
        } else {
          throw new Error('找不到匹配的部门。');
        }
      }
      console.log(`  已选择部门: ${departmentName}`);
    }

    // 6. 询问角色
    let role = 'User';
    const roleInput = await rl.question('\n请选择角色 (1: 普通用户, 2: 管理员) [默认: 1]: ');
    if (roleInput.trim() === '2') {
      role = 'Admin';
    }
    console.log(`  已设置角色: ${role}`);

    const defaultPassword = '888888';
    const email = `${username}@app.local`.toLowerCase();

    // 7. 二次确认
    console.log('\n=============================================');
    console.log('请确认以下用户信息：');
    console.log(`   姓名: ${name}`);
    console.log(`   账号/拼音: ${username}`);
    console.log(`   邮箱: ${email}`);
    console.log(`   工号: ${employeeNo || '(未设置)'}`);
    console.log(`   手机号: ${phone || '(未设置)'}`);
    console.log(`   英文名: ${englishName || '(未设置)'}`);
    console.log(`   初始密码: ${defaultPassword}`);
    console.log(`   角色: ${role}`);
    console.log(`   部门: ${departmentName || '(未设置)'}`);
    console.log('=============================================');

    const confirm = await rl.question('\n确认创建此用户吗？(y/n) [默认: y]: ');
    if (confirm.toLowerCase() === 'n') {
      console.log('已取消创建。');
      process.exit(0);
    }

    // 8. 在 Supabase Auth 中创建用户
    console.log(`\n正在 Auth 系统中创建账号...`);
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        name: name,
        username: username,
        role: role
      }
    });

    if (authError) {
      throw new Error(`Auth 创建失败: ${authError.message}`);
    }

    const authId = authData.user.id;
    console.log(`  Auth 账号创建成功! (Auth ID: ${authId})`);

    // 9. 在 public.users 业务表中插入记录
    const userId = `user-${Date.now()}`;
    console.log(`正在同步写入业务表 (public.users)...`);

    const { error: insertError } = await supabase
      .from('users')
      .insert([{
        id: userId,
        auth_id: authId,
        username: username,
        name: name,
        email: email,
        phone: phone || null,
        english_name: englishName || null,
        employee_no: employeeNo || null,
        role: role,
        department_id: departmentId,
        is_active: true,
        pad_permissions: [],
        reviews: {},
        system_role_ids: null,
        custom_permissions: null
      }]);

    if (insertError) {
      console.error(`  业务表记录写入失败: ${insertError.message}`);
      console.log(`  正在回滚：删除已创建的 Auth 账户...`);
      await supabase.auth.admin.deleteUser(authId);
      throw new Error('业务逻辑创建失败，已自动回滚清理Auth。');
    }

    console.log(`\n成功! 用户 ${name} 已创建完毕。`);
    console.log(`登录邮箱: ${email}`);
    console.log(`登录密码: ${defaultPassword}`);

  } catch (err) {
    console.error(`\n发生错误: ${err.message}`);
  } finally {
    rl.close();
  }
}

addUser();
