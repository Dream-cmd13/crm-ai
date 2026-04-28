import React, { useState } from 'react';
import { LayoutDashboard, MessageSquare, Target, Briefcase, FolderKanban, Users, CalendarDays, DollarSign, Package, FileBox, Undo2, Settings, FileText, X, ChevronDown, ChevronRight, Bell, ListTodo, Bot, Database, CheckSquare, Shield, BookOpen, Swords } from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ currentView, setCurrentView, isOpen, onClose }: SidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['AI大脑', '业务流转', '过程单据', '资源中心', '系统设置']);

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => 
      prev.includes(label) ? prev.filter(g => g !== label) : [...prev, label]
    );
  };

  const groups = [
    {
      label: '工作台',
      isStandalone: true,
      items: [
        { id: 'dashboard', label: '工作台', icon: CheckSquare },
      ]
    },
    {
      label: '业务流转',
      items: [
        { id: 'inquiries', label: '询盘池', icon: MessageSquare },
        { id: 'leads', label: '线索池', icon: Target },
        { id: 'opportunities', label: '商机池', icon: Briefcase },
        { id: 'projects', label: '项目管理', icon: FolderKanban },
        { id: 'customer-activation-calendar', label: '客户激活', icon: CalendarDays },
      ]
    },
    {
      label: '过程单据',
      items: [
        { id: 'quotations', label: '报价单', icon: FileText },
        { id: 'sample-orders', label: '样品单', icon: FileBox },
        { id: 'sales', label: '订单', icon: DollarSign },
        { id: 'return-orders', label: '退货单', icon: Undo2 },
      ]
    },
    {
      label: '资源中心',
      items: [
        { id: 'customers', label: '客户库', icon: Users },
        { id: 'competitor-library', label: '竞品库', icon: Swords },
        { id: 'case-library', label: '客户案例库', icon: BookOpen },
        { id: 'products', label: '产品资料', icon: Package },
        { id: 'product-categories', label: '产品系列', icon: FolderKanban },
      ]
    },
    {
      label: '设置',
      items: [
        { id: 'customer-strategy', label: '客户策略', icon: Swords },
        { id: 'architecture-settings', label: '架构设置', icon: Database },
        { id: 'settings', label: '系统设置', icon: Settings },
        { id: 'users-management', label: '用户管理', icon: Users },
        { id: 'permission-management', label: '权限管理', icon: Shield },
      ]
    }
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col h-full transition-transform duration-300 lg:static lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-white" />
            </div>
            <span>AI星销售</span>
          </div>
          <button onClick={onClose} className="lg:hidden p-2 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      <nav className="flex-1 py-4 px-3 overflow-y-auto space-y-1 custom-scrollbar">
        {groups.map((group) => {
          if (group.isStandalone) {
            const item = group.items[0];
            const isActive = currentView === item.id;
            return (
              <div key={group.label} className="mb-3">
                <button
                  onClick={() => setCurrentView(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-bold transition-colors",
                    isActive 
                      ? "bg-indigo-600 text-white shadow-sm" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <item.icon className={cn("w-4 h-4", isActive ? "text-indigo-100" : "text-gray-400")} />
                  {item.label}
                </button>
              </div>
            );
          }

          const isExpanded = expandedGroups.includes(group.label);
          return (
            <div key={group.label} className="space-y-0.5">
              <button 
                onClick={() => toggleGroup(group.label)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
              >
                <span>{group.label}</span>
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {isExpanded && (
                <div className="space-y-0.5 mb-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setCurrentView(item.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors",
                          isActive 
                            ? "bg-indigo-50 text-indigo-700" 
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        )}
                      >
                        <Icon className={cn("w-4 h-4", isActive ? "text-indigo-600" : "text-gray-400")} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50 flex-1">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
            U
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">当前用户</span>
            <span className="text-xs text-gray-500">在线</span>
          </div>
        </div>
        <button className="p-2 text-gray-400 hover:text-indigo-600 relative ml-2">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
        </button>
      </div>
      </div>
    </>
  );
}
