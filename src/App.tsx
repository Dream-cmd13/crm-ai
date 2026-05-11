import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Role, User } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import ChangePasswordModal from './components/ChangePasswordModal';
import { fetchLlmConfigFromSupabase } from './lib/llmConfigRepository';
import { fetchUserByAuthId } from './lib/userRepository';
import { useAuthStore } from './store/useAuthStore';
import { supabase } from './lib/supabaseClient';
import { Toaster } from 'react-hot-toast';

const TodoCenter = lazy(() => import('./pages/TodoCenter'));
const Inquiries = lazy(() => import('./pages/Inquiries'));
const Leads = lazy(() => import('./pages/Leads'));
const Opportunities = lazy(() => import('./pages/Opportunities'));
const Projects = lazy(() => import('./pages/Projects'));
const Customers = lazy(() => import('./pages/Customers'));
const CustomerVisitCalendar = lazy(() => import('./pages/CustomerVisitCalendar'));
const SalesQuotations = lazy(() => import('./pages/SalesQuotations'));
const SalesOrders = lazy(() => import('./pages/SalesOrders'));
const Products = lazy(() => import('./pages/Products'));
const ProductSpu = lazy(() => import('./pages/ProductSpu'));
const ProductCategories = lazy(() => import('./pages/ProductCategories'));
const ProductSeries = lazy(() => import('./pages/ProductSeries'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const ProductCategoryDetail = lazy(() => import('./pages/ProductCategoryDetail'));
const Brands = lazy(() => import('./pages/Brands'));
const Groups = lazy(() => import('./pages/Groups'));
const ProductLines = lazy(() => import('./pages/ProductLines'));
const SampleOrders = lazy(() => import('./pages/SampleOrders'));
const ReturnOrders = lazy(() => import('./pages/ReturnOrders'));
const SystemSettings = lazy(() => import('./pages/SystemSettings'));
const ArchitectureSettings = lazy(() => import('./pages/ArchitectureSettings'));
const PermissionManagement = lazy(() => import('./pages/PermissionManagement'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const CustomerTypes = lazy(() => import('./pages/CustomerTypes'));
const CaseLibraryPage = lazy(() => import('./pages/CaseLibraryPage'));
const CustomerStrategy = lazy(() => import('./pages/CustomerStrategy'));
const CompetitorLibrary = lazy(() => import('./pages/CompetitorLibrary'));
const WechatSession = lazy(() => import('./pages/WechatSession'));

type OpenTab = {
  key: string;
  view: string;
  params: any;
  label: string;
};

export default function App() {
  const { isAuthenticated, currentUser, login, logout } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentRole, setCurrentRole] = useState<Role>('业务员');
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([
    { key: 'dashboard', view: 'dashboard', params: null, label: '工作台' }
  ]);
  const [activeTabKey, setActiveTabKey] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 认证初始化
  useEffect(() => {
    const handleAuthChange = async (session: any) => {
      const userId = session?.user?.id;

      if (userId) {
        const user = await fetchUserByAuthId(userId);
        if (user) {
          login(user);
          setCurrentRole((user.role as Role) || '业务员');
        }
      }
      setIsInitializing(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthChange(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [login]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchLlmConfigFromSupabase().catch(() => {});
    }
  }, [isAuthenticated]);

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
      'product-spu': '产品品类',
      'product-categories': '产品类别',
      'product-series': '产品系列',
      'product-detail': '产品详情',
      'product-category-detail': '产品类别详情',
      brands: '品牌管理',
      groups: '归属小组',
      'product-lines': '产品线',
      'sample-orders': '样品单',
      'return-orders': '退货单',
      settings: '系统设置',
      'architecture-settings': '架构设置',
      'wechat-session': '微信会话',
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
      case 'product-spu': return <ProductSpu />;
      case 'product-categories': return <ProductCategories {...props} />;
      case 'product-series': return <ProductSeries {...props} />;
      case 'product-detail': return <ProductDetail {...props} />;
      case 'product-category-detail': return <ProductCategoryDetail {...props} />;
      case 'brands': return <Brands />;
      case 'groups': return <Groups />;
      case 'product-lines': return <ProductLines />;
      case 'sample-orders': return <SampleOrders {...props} />;
      case 'return-orders': return <ReturnOrders {...props} />;
      case 'settings': return <SystemSettings {...props} />;
      case 'architecture-settings': return <ArchitectureSettings />;
      case 'wechat-session': return <WechatSession />;
      case 'permission-management': return <PermissionManagement />;
      case 'users-management': return <UserManagement />;
      case 'customer-types': return <CustomerTypes />;
      case 'case-library': return <CaseLibraryPage />;
      default: return <TodoCenter {...props} />;
    }
  };

  const pageLoadingFallback = <div className="p-4 text-sm text-gray-500">页面加载中...</div>;

  // 初始化中
  if (isInitializing) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest animate-pulse">正在初始化系统...</p>
      </div>
    );
  }

  // 未登录 → 显示登录页
  if (!isAuthenticated || !currentUser) {
    return (
      <>
        <LoginPage onLoginSuccess={() => {}} />
        <Toaster position="top-center" />
      </>
    );
  }

  // 已登录 → 主应用
  const handleLogout = async () => {
    await logout();
    setOpenTabs([{ key: 'dashboard', view: 'dashboard', params: null, label: '工作台' }]);
    setActiveTabKey('dashboard');
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
        currentUserName={currentUser.name}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-0">
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
          currentUserName={currentUser.name}
          onChangePassword={() => setShowChangePassword(true)}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-3 md:p-4">
          {openTabs.map((tab) => (
            <div key={tab.key} className={tab.key === activeTabKey ? 'block' : 'hidden'}>
              <Suspense fallback={pageLoadingFallback}>
                {renderView(tab.view, tab.params)}
              </Suspense>
            </div>
          ))}
        </main>
      </div>
      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
      <Toaster position="top-center" />
    </div>
  );
}
