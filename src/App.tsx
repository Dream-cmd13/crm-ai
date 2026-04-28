import React, { useEffect, useState } from 'react';
import { Role } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import TodoCenter from './pages/TodoCenter';
import Inquiries from './pages/Inquiries';
import Leads from './pages/Leads';
import Opportunities from './pages/Opportunities';
import Projects from './pages/Projects';
import Customers from './pages/Customers';
import CustomerVisitCalendar from './pages/CustomerVisitCalendar';
import SalesQuotations from './pages/SalesQuotations';
import SalesOrders from './pages/SalesOrders';
import Products from './pages/Products';
import SampleOrders from './pages/SampleOrders';
import ReturnOrders from './pages/ReturnOrders';
import SystemSettings from './pages/SystemSettings';
import UserManagement from './pages/UserManagement';
import CustomerTypes from './pages/CustomerTypes';
import CaseLibraryPage from './pages/CaseLibraryPage';
import ArchitectureSettings from './pages/ArchitectureSettings';
import { fetchLlmConfigFromSupabase } from './lib/llmConfigRepository';
import { fetchUsersFromSupabase } from './lib/userRepository';
import { User } from './types';
import { Toaster } from 'react-hot-toast';

import PermissionManagement from './pages/PermissionManagement';
import { Shield } from 'lucide-react';

import ProductCategories from './pages/ProductCategories';
import CustomerStrategy from './pages/CustomerStrategy';
import CompetitorLibrary from './pages/CompetitorLibrary';

type OpenTab = {
  key: string;
  view: string;
  params: any;
  label: string;
};

export default function App() {
  const [currentRole, setCurrentRole] = useState<Role>('业务员');
  const [currentUser, setCurrentUser] = useState<User>({
    id: 'EMP001',
    ent_name: '总公司',
    username: 'admin',
    name: '系统管理员',
    role: '管理员',
    roles: ['管理员'],
    department_id: 'admin',
    employeeNo: 'E001',
    dataPermissions: { customerVisibility: 'all' }
  });
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([
    { key: 'dashboard', view: 'dashboard', params: null, label: '工作台' }
  ]);
  const [activeTabKey, setActiveTabKey] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    fetchLlmConfigFromSupabase().catch(() => {});
  }, []);

  useEffect(() => {
    fetchUsersFromSupabase().then((users) => {
      const admin = (users || []).find((u) => String(u.username) === 'admin') || (users || []).find((u) => String(u.id) === 'EMP001');
      if (admin) {
        setCurrentUser(admin);
        setCurrentRole((admin.role as any) || '业务员');
      }
    }).catch(() => {});
  }, []);

  const getViewLabel = (view: string, params?: any) => {
    const map: Record<string, string> = {
      dashboard: '工作台',
      inquiries: '询盘池',
      leads: '线索池',
      opportunities: '商机池',
      projects: '项目管理',
      customers: '客户库',
      'customer-activation-calendar': '客户激活',
      'activation-task-pool': '激活任务池',
      'customer-strategy': '客户策略',
      'competitor-library': '竞品库',
      quotations: '报价单',
      sales: '订单',
      products: '产品资料',
      'product-categories': '产品系列',
      'sample-orders': '样品单',
      'return-orders': '退货单',
      settings: '系统设置',
      'architecture-settings': '架构设置',
      'permission-management': '权限管理',
      'users-management': '用户管理',
      'customer-types': '客户类型',
      'case-library': '客户案例库'
    };
    const base = map[view] || view;
    const docName = params?.name || params?.title || params?.projectName || params?.customerName || '';
    return docName ? `${base} · ${docName}` : base;
  };

  const buildTabKey = (view: string, params?: any) => {
    const docId = params?.id || params?.sourceId || params?.customerId || params?.projectId || params?.orderNo || params?.quoteNo || params?.sampleNo || params?.returnNo;
    if (docId) return `${view}:${String(docId)}`;
    return view;
  };

  const openOrActivateTab = (view: string, params?: any) => {
    const key = buildTabKey(view, params);
    setOpenTabs((prev) => {
      const existed = prev.find((t) => t.key === key);
      if (existed) return prev;
      return [...prev, { key, view, params: params || null, label: getViewLabel(view, params) }];
    });
    setActiveTabKey(key);
  };

  const closeTab = (key: string) => {
    setOpenTabs((prev) => {
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex((t) => t.key === key);
      if (idx < 0) return prev;
      const next = prev.filter((t) => t.key !== key);
      if (activeTabKey === key) {
        const fallback = next[Math.max(0, idx - 1)] || next[0];
        setActiveTabKey(fallback?.key || 'dashboard');
      }
      return next;
    });
  };

  const navigateTo = (view: string, params?: any) => {
    openOrActivateTab(view, params);
  };

  const goBack = () => {
    const idx = openTabs.findIndex((t) => t.key === activeTabKey);
    if (idx > 0) setActiveTabKey(openTabs[idx - 1].key);
  };

  const current = openTabs.find((t) => t.key === activeTabKey) || openTabs[0];
  const currentView = current.view;
  const viewParams = current.params;

  const handleSidebarNav = (view: string) => {
    openOrActivateTab(view, null);
  };

  const renderView = (view: string, params: any) => {
    const props: any = { role: currentRole, currentUser, viewParams: params, navigateTo, goBack };
    switch (view) {
      case 'dashboard': return <TodoCenter {...props} />;
      case 'inquiries': return <Inquiries {...props} />;
      case 'leads': return <Leads {...props} />;
      case 'opportunities': return <Opportunities {...props} />;
      case 'projects': return <Projects {...props} />;
      case 'customers': return <Customers {...props} />;
      case 'customer-activation-calendar': return <CustomerVisitCalendar {...props} />;
      case 'activation-task-pool': return <CustomerVisitCalendar {...props} />;
      case 'customer-strategy': return <CustomerStrategy />;
      case 'competitor-library': return <CompetitorLibrary />;
      case 'quotations': return <SalesQuotations {...props} />;
      case 'sales': return <SalesOrders {...props} />;
      case 'products': return <Products {...props} />;
      case 'product-categories': return <ProductCategories />;
      case 'sample-orders': return <SampleOrders {...props} />;
      case 'return-orders': return <ReturnOrders {...props} />;
      case 'settings': return <SystemSettings {...props} />;
      case 'architecture-settings': return <ArchitectureSettings />;
      case 'permission-management': return <PermissionManagement />;
      case 'users-management': return <UserManagement />;
      case 'customer-types': return <CustomerTypes />;
      case 'case-library': return <CaseLibraryPage />;
      default: return <TodoCenter {...props} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={(view) => {
          handleSidebarNav(view);
          setIsSidebarOpen(false);
        }} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header 
          currentRole={currentRole} 
          setCurrentRole={setCurrentRole} 
          onMenuClick={() => setIsSidebarOpen(true)}
          currentView={currentView}
          onNavigate={(view) => handleSidebarNav(view)}
          openTabs={openTabs}
          activeTabKey={activeTabKey}
          onActivateTab={(key) => setActiveTabKey(key)}
          onCloseTab={closeTab}
          currentUserName="张三"
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-3 md:p-4">
          {openTabs.map((tab) => (
            <div key={tab.key} className={tab.key === activeTabKey ? 'block' : 'hidden'}>
              {renderView(tab.view, tab.params)}
            </div>
          ))}
        </main>
      </div>
      <Toaster position="top-center" />
    </div>
  );
}
