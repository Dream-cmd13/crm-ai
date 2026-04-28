import { toast } from 'react-hot-toast';
import { isSupabaseConfigured } from './supabaseClient';

type SupabaseFailureKind = 'config' | 'permission' | 'network' | 'timeout' | 'unknown';

const detectKind = (error: unknown): SupabaseFailureKind => {
  if (!isSupabaseConfigured()) return 'config';
  const text = String((error as any)?.message || '').toLowerCase();
  const code = String((error as any)?.code || '').toUpperCase();
  const status = Number((error as any)?.status || 0);

  if (status === 401 || status === 403 || code === '42501') return 'permission';
  if (text.includes('failed to fetch') || text.includes('network') || text.includes('err_failed')) return 'network';
  if (text.includes('timeout') || text.includes('timed out')) return 'timeout';
  return 'unknown';
};

export const buildSupabaseFailureMessage = (scene: string, error?: unknown) => {
  const kind = detectKind(error);
  if (kind === 'config') return `${scene}失败：未检测到 Supabase 配置（请检查 URL / ANON KEY）`;
  if (kind === 'permission') return `${scene}失败：当前账号缺少数据库权限（请检查 RLS / Policy）`;
  if (kind === 'network') return `${scene}失败：网络或 Supabase 服务暂不可达，请稍后重试`;
  if (kind === 'timeout') return `${scene}失败：请求超时，请稍后重试`;
  const detail = String((error as any)?.message || '').trim();
  return detail ? `${scene}失败：${detail}` : `${scene}失败：Supabase 暂不可用`;
};

export const notifySupabaseFailure = (scene: string, error?: unknown) => {
  const msg = buildSupabaseFailureMessage(scene, error);
  toast.error(msg);
  return msg;
};

