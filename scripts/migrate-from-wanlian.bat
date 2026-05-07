@echo off
chcp 65001 >nul
echo =============================================
echo   wanlian 数据迁移到 AI星销售
echo =============================================
echo.

REM ★ 填入 wanlian MySQL 连接参数
REM   hostname = database = username = password = 统一值
set WANLIAN_HOST=
set WANLIAN_PORT=3306
set WANLIAN_USER=%WANLIAN_HOST%
set WANLIAN_PASSWORD=%WANLIAN_HOST%
set WANLIAN_DATABASE=%WANLIAN_HOST%

REM ★ 填入 Supabase 配置
set SUPABASE_URL=http://47.115.252.150
REM set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

echo 请确认环境变量已正确设置：
echo   WANLIAN_HOST=%WANLIAN_HOST%
echo   SUPABASE_URL=%SUPABASE_URL%
echo.

if "%WANLIAN_HOST%"=="" (
  set /p WANLIAN_HOST="请输入 wanlian 连接参数 (host/port/user/password/database 共用): "
  set WANLIAN_PORT=3306
  set WANLIAN_USER=%WANLIAN_HOST%
  set WANLIAN_PASSWORD=%WANLIAN_HOST%
  set WANLIAN_DATABASE=%WANLIAN_HOST%
)

if "%SUPABASE_SERVICE_ROLE_KEY%"=="" (
  set /p SUPABASE_SERVICE_ROLE_KEY="请输入 Supabase Service Role Key: "
)

echo.
echo 正在执行迁移...
node scripts/migrate-from-wanlian.mjs
pause
