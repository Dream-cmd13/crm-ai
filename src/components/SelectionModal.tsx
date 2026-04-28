import React, { useState, useMemo } from 'react';
import { X, Search, Check, Folder } from 'lucide-react';
import { cn } from '../lib/utils';

interface Category {
  id: string;
  name: string;
  parentId?: string;
}

interface SelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: any[];
  onSelect: (item: any) => void;
  searchPlaceholder?: string;
  renderItem?: (item: any) => React.ReactNode;
  filterFn?: (item: any, searchTerm: string) => boolean;
  categories?: Category[];
  categoryKey?: string; // The key in item that matches category id
}

export default function SelectionModal({
  isOpen,
  onClose,
  title,
  items,
  onSelect,
  searchPlaceholder = "搜索...",
  renderItem,
  filterFn,
  categories,
  categoryKey = 'categoryId'
}: SelectionModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredItems = items.filter(item => {
    const matchesSearch = filterFn 
      ? filterFn(item, searchTerm) 
      : Object.values(item).some(val => 
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        );
    
    const matchesCategory = !selectedCategory || item[categoryKey] === selectedCategory || item.department_id === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Build category tree
  const buildTree = (cats: any[], parentId?: string): any[] => {
    // If cats already has children or sub_departments, it might be already a tree
    if (cats.length > 0 && (cats[0].children || cats[0].sub_departments)) {
      return cats.map(c => ({
        ...c,
        children: c.children || c.sub_departments || []
      }));
    }
    return cats
      .filter(c => c.parentId === parentId)
      .map(c => ({
        ...c,
        children: buildTree(cats, c.id)
      }));
  };

  const categoryTree = categories ? buildTree(categories) : [];

  const renderCategoryNode = (node: any, depth = 0) => (
    <div key={node.id}>
      <button
        onClick={() => setSelectedCategory(node.id === selectedCategory ? null : node.id)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left",
          selectedCategory === node.id ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-50"
        )}
        style={{ paddingLeft: `${depth * 1 + 0.75}rem` }}
      >
        <Folder className="w-4 h-4 text-indigo-400 shrink-0" />
        <span className="truncate">{node.name}</span>
      </button>
      {node.children?.map((child: any) => renderCategoryNode(child, depth + 1))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {categories && categories.length > 0 && (
            <div className="w-64 border-r border-gray-100 flex flex-col bg-gray-50/50 shrink-0">
              <div className="p-3 border-b border-gray-100 font-medium text-sm text-gray-700">
                分类导航
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left",
                    selectedCategory === null ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <Folder className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="truncate">全部</span>
                </button>
                {categoryTree.map(node => renderCategoryNode(node))}
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col min-w-0">
            <div className="p-4 border-b border-gray-100 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              <div className="grid grid-cols-1 gap-1">
                {filteredItems.map((item, idx) => (
                  <button
                    key={item.id || idx}
                    onClick={() => {
                      onSelect(item);
                      onClose();
                    }}
                    className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-indigo-50 text-left transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      {renderItem ? renderItem(item) : (
                        <>
                          <div className="font-medium text-gray-900 truncate">{item.name || item.projectName || item.productName || item.label}</div>
                          {item.code && <div className="text-xs text-gray-500 font-mono mt-0.5">{item.code}</div>}
                        </>
                      )}
                    </div>
                    <Check className="w-4 h-4 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-4" />
                  </button>
                ))}
                {filteredItems.length === 0 && (
                  <div className="py-12 text-center text-gray-500 italic">
                    未找到匹配项
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
