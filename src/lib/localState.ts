export const loadLocalState = <T,>(key: string, fallback: T): T => {
  // 已禁用本地持久化：统一由 Supabase 作为唯一数据源。
  return fallback;
};

export const saveLocalState = (key: string, value: unknown) => {
  // 已禁用本地持久化：统一由 Supabase 作为唯一数据源。
  return;
};
