# Supabase 不可用统一提示策略

## 目标
- 所有“读/写 Supabase”失败场景，对用户给出一致、可执行的提示。
- 将“技术错误”转成“业务可理解”文案，减少模糊报错。
- 统一前端处理口径：先分类，再提示，再记录日志。

## 适用范围
- 所有依赖 `supabase-js` 的页面、组件、仓储函数。
- 包含：系统配置、主数据维护、单据保存、AI 配置、任务生成等。

## 失败分类
- 配置缺失：`VITE_SUPABASE_URL` 或 `VITE_SUPABASE_ANON_KEY` 缺失。
- 权限不足：401/403，或 Postgres/RLS 常见权限码（如 `42501`）。
- 网络不可达：`Failed to fetch`、`ERR_FAILED`、网络中断。
- 请求超时：超时关键字或超时异常。
- 未知异常：以上未命中。

## 统一提示文案
- 配置缺失：`{场景}失败：未检测到 Supabase 配置（请检查 URL / ANON KEY）`
- 权限不足：`{场景}失败：当前账号缺少数据库权限（请检查 RLS / Policy）`
- 网络不可达：`{场景}失败：网络或 Supabase 服务暂不可达，请稍后重试`
- 请求超时：`{场景}失败：请求超时，请稍后重试`
- 未知异常：`{场景}失败：Supabase 暂不可用`（若有 message，可直接拼接）

## 前端执行规范
- 页面层只调用统一方法：`notifySupabaseFailure(scene, error)`。
- `scene` 用业务动作命名，例如：`系统设置保存`、`客户画像AI配置保存`。
- `catch` 中保留 `console.error`，用于研发排查。
- 不再在页面中散落“请检查 Supabase 配置”等手写文案。

## 代码落地点
- 统一工具：`src/lib/supabaseFailureNotice.ts`
- 已接入入口：
  - `src/pages/SystemSettings.tsx`
  - `src/components/PersonaAISettings.tsx`
  - `src/components/CompetitorAiSettings.tsx`

## 后续扩展建议
- 分批替换全项目历史 `toast.error('...Supabase...')`。
- 对关键写入动作补“自动重试 1 次 + 幂等保护”。
- 增加一个“连接状态指示器”，在顶部展示当前 Supabase 可用性。
