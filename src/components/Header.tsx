import React from 'react';
import { Role } from '../types';
import { Menu, X } from 'lucide-react';

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
}

export default function Header({
  currentRole,
  onMenuClick,
  openTabs = [],
  activeTabKey,
  onActivateTab,
  onCloseTab,
  currentUserName = '张三'
}: HeaderProps) {

  return (
    <header className="bg-gradient-to-b from-gray-100 to-gray-50 border-b border-gray-300 shrink-0">
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
      </div>
    </header>
  );
}
