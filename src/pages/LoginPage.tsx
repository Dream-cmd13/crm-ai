import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabaseClient';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!username.trim() || !password.trim()) {
      toast.error('请输入用户名和密码');
      return;
    }

    setIsLoading(true);

    try {
      const email = username.trim().includes('@')
        ? username.trim().toLowerCase()
        : `${username.trim()}@app.local`.toLowerCase();
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        toast.error(`登录失败：${authError.message}`);
        return;
      }

      if (authData.user) {
        toast.success('登录成功，正在进入系统...');
        onLoginSuccess();
      }
    } catch (error: any) {
      toast.error(`登录出错：${error.message || '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 p-6">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-10 animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-50 rounded-3xl mb-4">
            <ShieldCheck className="h-10 w-10 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tighter">AI星销售 工作台</h1>
          <p className="text-slate-400 text-xs font-bold mt-2 uppercase tracking-widest">SalesFlow CRM AI</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">登录账号</label>
            <input
              type="text"
              autoComplete="username"
              className="w-full bg-transparent text-sm font-bold outline-none text-slate-700 placeholder:text-slate-300"
              placeholder="请输入用户名"
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">登录密码</label>
            <input
              type="password"
              autoComplete="current-password"
              className="w-full bg-transparent text-sm font-bold outline-none text-slate-700 placeholder:text-slate-300"
              placeholder="请输入密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              "w-full text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2",
              isLoading ? "bg-slate-700 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200"
            )}
          >
            {isLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                正在验证身份...
              </>
            ) : (
              "验证身份并进入"
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-50 text-center">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
            &copy; 2026 SalesFlow CRM AI. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
