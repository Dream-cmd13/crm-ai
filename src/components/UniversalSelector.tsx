import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronRight, ChevronDown, CheckCircle2, Loader2, Users, Package, Building2, UserCircle, FolderTree, Briefcase } from 'lucide-react';
import { cn } from '../lib/utils';
import { fetchUsersFromSupabase, fetchDepartmentsFromSupabase } from '../lib/userRepository';
import { fetchProductsFromSupabase, fetchProductCategoriesFromSupabase } from '../lib/productRepository';
import { fetchCustomersModuleDataFromSupabase } from '../lib/customerRepository';
import { getSupabaseClient } from '../lib/supabaseClient';
import { fetchProjectsFromSupabase } from '../lib/projectRepository';

export type SelectorType = 'customer' | 'product' | 'user' | 'category' | 'contact' | 'project';

export interface UniversalSelectorProps {
  type: SelectorType;
  multiple?: boolean;
  onSelect?: (item: any) => void;
  onSelectMultiple?: (items: any[]) => void;
  onClose?: () => void;
  inline?: boolean;
  selectedId?: string;
  selectedIds?: string[];
  customerId?: string; // used to filter contacts by customer
}

export default function UniversalSelector({
  type,
  multiple = false,
  onSelect,
  onSelectMultiple,
  onClose,
  inline = false,
  selectedId,
  selectedIds = [],
  customerId
}: UniversalSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Main list data
  const [items, setItems] = useState<any[]>([]);
  // Tree data (for categories or departments)
  const [treeData, setTreeData] = useState<any[]>([]);
  
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>(selectedIds);

  const flattenTree = (nodes: any[], childrenKey: string = 'children') => {
    const result: any[] = [];
    const walk = (items: any[]) => {
      items.forEach((item) => {
        result.push(item);
        const children = item?.[childrenKey];
        if (children?.length) walk(children);
      });
    };
    walk(nodes || []);
    return result;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (type === 'user') {
          const [users, depts] = await Promise.all([
            fetchUsersFromSupabase(),
            fetchDepartmentsFromSupabase()
          ]);
          setItems(users || []);
          setTreeData(depts || []);
          if (depts?.length > 0) setExpandedNodes([depts[0].id]);
        } 
        else if (type === 'product') {
          const [products, cats] = await Promise.all([
            fetchProductsFromSupabase(),
            fetchProductCategoriesFromSupabase()
          ]);
          setItems(products || []);
          setTreeData(cats || []);
          if (cats?.length > 0) setExpandedNodes([cats[0].id]);
        }
        else if (type === 'customer') {
          const { customers } = await fetchCustomersModuleDataFromSupabase();
          setItems(customers || []);
        }
        else if (type === 'category') {
          const cats = await fetchProductCategoriesFromSupabase();
          setItems(flattenTree(cats || []));
          setTreeData(cats || []);
          if (cats?.length > 0) setExpandedNodes([cats[0].id]);
        }
        else if (type === 'contact') {
          const supabase = getSupabaseClient();
          let query = supabase.from('crm_ontology_object').select('*').eq('code', 'contact');
          const { data } = await query;
          if (data) {
             const parsed = data.map(d => ({
               id: d.id,
               name: d.data?.name || d.name || '未命名联系人',
               phone: d.data?.phone || d.data?.mobile || '',
               position: d.data?.position || '',
               ...d.data
             }));
             setItems(parsed);
          } else {
             setItems([]);
          }
        }
        else if (type === 'project') {
          const projects = await fetchProjectsFromSupabase();
          const filtered = customerId ? (projects || []).filter((p: any) => p.customerId === customerId) : (projects || []);
          setItems(filtered);
        }
      } catch (err) {
        console.error(`Failed to load data for ${type} selector`, err);
        setItems([]);
        setTreeData([]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [type, customerId]);

  const toggleNode = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => 
      prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]
    );
  };

  const handleItemClick = (item: any) => {
    if (multiple) {
      setTempSelectedIds(prev => 
        prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
      );
    } else {
      onSelect?.(item);
    }
  };

  const handleConfirm = () => {
    if (multiple && onSelectMultiple) {
      const selectedItems = items.filter(item => tempSelectedIds.includes(item.id));
      onSelectMultiple(selectedItems);
    }
  };

  // Helper to render tree nodes (recursive)
  const renderTree = (node: any, level: number = 0) => {
    const isExpanded = expandedNodes.includes(node.id);
    const children = type === 'user' ? node.sub_departments : node.children;
    const hasChildren = children && children.length > 0;
    const isSelected = selectedNodeId === node.id;
    
    let Icon = Users;
    if (type === 'product' || type === 'category') Icon = FolderTree;

    return (
      <div key={node.id} className="select-none">
        <div 
          className={cn(
            "flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors",
            isSelected && "bg-indigo-50 text-indigo-700"
          )}
          style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
          onClick={() => {
            setSelectedNodeId(node.id);
            if (type === 'category' && !multiple) {
               onSelect?.(node);
            }
          }}
        >
          <div 
            className="w-5 h-5 flex items-center justify-center shrink-0"
            onClick={(e) => hasChildren && toggleNode(node.id, e)}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />
            ) : <span className="w-4 h-4" />}
          </div>
          <Icon className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-sm font-medium truncate">{node.name}</span>
        </div>
        {isExpanded && hasChildren && (
          <div>
            {children.map((sub: any) => renderTree(sub, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Filtering logic
  const filteredItems = items.filter(item => {
    const query = searchQuery.toLowerCase();
    let matchesSearch = true;
    let matchesTree = true;
    
    if (type === 'user') {
      matchesSearch = (item.name || '').toLowerCase().includes(query) || (item.username || '').toLowerCase().includes(query);
      matchesTree = selectedNodeId ? item.department_id === selectedNodeId : true;
    } else if (type === 'product') {
      matchesSearch = (item.materialName || '').toLowerCase().includes(query) || (item.materialNo || '').toLowerCase().includes(query);
      if (selectedNodeId) {
        const collectCategoryIds = (rootId: string): string[] => {
          const ids = new Set<string>([rootId]);
          const queue: any[] = [...treeData];
          while (queue.length) {
            const current = queue.shift();
            if (current?.id && ids.has(current.id) && current?.children?.length) {
              current.children.forEach((c: any) => ids.add(c.id));
            }
            if (current?.children?.length) queue.push(...current.children);
          }
          return Array.from(ids);
        };
        const allowed = collectCategoryIds(selectedNodeId);
        matchesTree = allowed.includes(item.categoryId);
      } else {
        matchesTree = true;
      }
    } else if (type === 'customer') {
      matchesSearch = (item.name || '').toLowerCase().includes(query);
    } else if (type === 'contact') {
      matchesSearch = (item.name || '').toLowerCase().includes(query) || (item.phone || '').toLowerCase().includes(query);
    } else if (type === 'category') {
      matchesSearch = (item.name || '').toLowerCase().includes(query) || (item.id || '').toLowerCase().includes(query);
      matchesTree = selectedNodeId ? item.id.startsWith(selectedNodeId) : true;
    } else if (type === 'project') {
      matchesSearch = (item.projectName || '').toLowerCase().includes(query) || (item.customerName || '').toLowerCase().includes(query);
    }
    
    return matchesSearch && matchesTree;
  });

  const getTitle = () => {
    switch(type) {
      case 'customer': return '选择客户';
      case 'product': return '选择产品';
      case 'user': return '选择人员';
      case 'category': return '选择产品类别';
      case 'contact': return '选择联系人';
      case 'project': return '选择项目';
      default: return '选择';
    }
  };

  const hasSidebar = type === 'user' || type === 'product' || type === 'category';

  const content = (
    <div className={cn("flex flex-col h-full", inline ? "w-full" : "bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[600px] overflow-hidden")}>
      {!inline && (
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h3 className="text-lg font-bold text-gray-900">{getTitle()}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="text-2xl leading-none">&times;</span>
          </button>
        </div>
      )}

      <div className={cn("flex flex-1 overflow-hidden", inline ? "flex-col" : "flex-row")}>
        {hasSidebar && (
          <div className={cn("border-gray-200 flex flex-col bg-gray-50/50", inline ? "h-1/3 border-b" : "w-1/3 border-r")}>
            {!inline && (
              <div className="p-4 border-b border-gray-200">
                <h4 className="text-sm font-bold text-gray-700">
                  {type === 'user' ? '组织架构' : '分类'}
                </h4>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 text-gray-400 animate-spin" /></div>
              ) : treeData.map(node => renderTree(node))}
            </div>
          </div>
        )}

        {/* Main List */}
        {(
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="搜索..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-sm">加载中...</span>
                </div>
              ) : filteredItems.length > 0 ? (
                <div className={cn("grid gap-3", inline ? "grid-cols-1" : "grid-cols-2")}>
                  {filteredItems.map(item => {
                    const isSelected = multiple ? tempSelectedIds.includes(item.id) : selectedId === item.id;
                    
                    let ItemIcon = Users;
                    if (type === 'product') ItemIcon = Package;
                    if (type === 'customer') ItemIcon = Building2;
                    if (type === 'user' || type === 'contact') ItemIcon = UserCircle;
                    if (type === 'project') ItemIcon = Briefcase;
                    if (type === 'category') ItemIcon = FolderTree;

                    return (
                      <div 
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className={cn(
                          "flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all",
                          isSelected 
                            ? "border-indigo-500 bg-indigo-50" 
                            : "border-gray-200 hover:border-indigo-500 hover:bg-indigo-50"
                        )}
                      >
                        {multiple && (
                          <div className={cn(
                            "w-5 h-5 rounded border flex items-center justify-center shrink-0",
                            isSelected ? "bg-indigo-600 border-indigo-600" : "border-gray-300 bg-white"
                          )}>
                            {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                        )}
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                          isSelected ? "bg-indigo-200 text-indigo-700" : "bg-gray-100 text-gray-600"
                        )}>
                          <ItemIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900 text-sm truncate">
                            {type === 'product' ? item.materialName : type === 'project' ? item.projectName : item.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {type === 'product'
                              ? item.materialNo
                              : type === 'user'
                                ? item.role
                                : type === 'contact'
                                  ? item.phone
                                  : type === 'project'
                                    ? item.customerName || item.id
                                    : type === 'category'
                                      ? item.id
                                      : item.id}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                  没有找到符合条件的数据
                </div>
              )}
            </div>
            {multiple && (
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  已选择 <span className="font-bold text-indigo-600">{tempSelectedIds.length}</span> 项
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button 
                    onClick={handleConfirm}
                    className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm"
                  >
                    确定
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (inline) {
    return content;
  }

  return createPortal(
    <div className="fixed top-0 left-0 right-0 bottom-0 z-[10010] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      {content}
    </div>,
    document.body
  );
}
