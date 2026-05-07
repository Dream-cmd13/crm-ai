import React, { useState, useRef, useEffect } from 'react';
import { Role } from '../types';
import { Menu, X, User, Key, LogOut, ChevronDown } from 'lucide-react';

interface HeaderProps {
  currentRole: Role;
  setCurrentRole: (role: Role) => void;
  onMenuClick?: () => void;
  currentView?: string;
  onNavigate?: (view: string) => void;
  openTabs?: Array<{ key: string; label: string; view: string }>;
  activeTabKey?: string;
  onActivateTab?: (key: string) => void;
  onCloseTab?: (key: string) => void;
  currentUserName?: string;
  onChangePassword?: () => void;
  onLogout?: () => void;
}

export default function Header({
  currentRole,
  onMenuClick,
  openTabs = [],
  activeTabKey,
  onActivateTab,
  onCloseTab,
  currentUserName = '',
  onChangePassword,
  onLogout,
}: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="relative z-10 bg-gradient-to-b from-gray-100 to-gray-50 border-b border-gray-300 shrink-0">
      <div className="h-12 flex items-center gap-3 px-3 md:px-4">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-1 text-gray-500 hover:text-gray-700 hover:bg-white rounded-lg transition-colors shrink-0 border border-transparent hover:border-gray-200 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex-1 overflow-x-auto no-scrollbar">
          <div className="flex items-end gap-1.5 min-w-max pt-1">
          {openTabs.map((tab) => (
            <div
              key={tab.key}
              className={`inline-flex items-center rounded-t-lg border text-xs shadow-sm ${
                activeTabKey === tab.key
                  ? 'bg-white border-gray-300 text-gray-900 border-b-white -mb-px'
                  : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <button
                onClick={() => onActivateTab?.(tab.key)}
                className={`px-3 py-1.5 font-medium transition-colors ${activeTabKey === tab.key ? 'hover:bg-gray-50 rounded-tl-lg' : 'hover:bg-gray-50 rounded-tl-lg'}`}
                title={tab.label}
              >
                {tab.label}
              </button>
              <button
                onClick={() => onCloseTab?.(tab.key)}
                className="px-1.5 py-1.5 border-l border-gray-200 hover:bg-red-50 hover:text-red-500 rounded-tr-lg transition-colors"
                title="关闭页签"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {openTabs.length === 0 && <span className="text-xs text-gray-400">暂无页面</span>}
          </div>
        </div>

        {/* 用户菜单 */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-white hover:border-gray-300 rounded-lg border border-transparent transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
              {currentUserName?.charAt(0) || 'U'}
            </div>
            <span className="hidden sm:inline max-w-[80px] truncate">{currentUserName || '用户'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900 truncate">{currentUserName}</p>
                <p className="text-xs text-gray-500">{currentRole}</p>
              </div>
              <button
                onClick={() => { setShowUserMenu(false); onChangePassword?.(); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Key className="w-4 h-4 text-gray-400" />
                修改密码
              </button>
              <button
                onClick={() => { setShowUserMenu(false); onLogout?.(); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
