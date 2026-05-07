@echo off
chcp 65001 >nul
echo =============================================
echo   AI星销售 新增用户脚本
echo =============================================
echo.
echo 请确保已设置 SUPABASE_SERVICE_ROLE_KEY 环境变量
echo 或在此文件中修改其值。
echo.

REM ★ 此处填入 Supabase Service Role Key
REM set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

set SUPABASE_URL=http://47.115.252.150

if "%SUPABASE_SERVICE_ROLE_KEY%"=="" (
  set /p SUPABASE_SERVICE_ROLE_KEY="请输入 Supabase Service Role Key: "
)

echo.
node scripts/add-user.mjs
pause
