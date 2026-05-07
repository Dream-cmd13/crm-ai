import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Search, Filter, ChevronRight, ChevronDown, Edit2, Trash2, FolderTree, Settings, Loader2 } from 'lucide-react';
import { ProductCategory, Product, CategoryAttribute, ProductSeries } from '../types';
import DetailModal from '../components/DetailModal';
import { cn } from '../lib/utils';
import { fetchProductCategoriesFromSupabase, fetchProductSeriesFromSupabase, fetchProductsFromSupabase, saveProductToSupabase, deleteProductFromSupabase, saveProductCategoryToSupabase, deleteProductCategoryFromSupabase } from '../lib/productRepository';
import { initialProductCategories, initialProducts } from '../data/products';
import { confirmDialog } from '../lib/toastConfirm';

interface ProductsProps {
  role?: any;
  viewParams?: any;
  navigateTo?: (view: string, params?: any) => void;
  goBack?: () => void;
}

export default function Products({ viewParams, navigateTo }: ProductsProps) {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [seriesList, setSeriesList] = useState<ProductSeries[]>([]);
  const [displayCount, setDisplayCount] = useState(20);
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchSeries();
  }, []);

  const fetchCategories = async () => {
    try {
      const remote = await fetchProductCategoriesFromSupabase();
      setCategories(remote.length > 0 ? remote : initialProductCategories);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setCategories(initialProductCategories);
    }
  };

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const remote = await fetchProductsFromSupabase();
      setProducts(remote.length > 0 ? remote : initialProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts(initialProducts);
    } finally {
      setIsLoading(false);
    }
  };
  const fetchSeries = async () => {
    try {
      const rows = await fetchProductSeriesFromSupabase();
      setSeriesList(rows || []);
    } catch (error) {
      console.error('Error fetching product series:', error);
      setSeriesList([]);
    }
  };

  const getFlatCategories = (nodes: ProductCategory[]): ProductCategory[] => {
    const result: ProductCategory[] = [];
    const walk = (items: ProductCategory[]) => {
      items.forEach((item) => {
        result.push(item);
        if (item.children?.length) walk(item.children);
      });
    };
    walk(nodes);
    return result;
  };

  const selectedCategoryIds = useMemo(() => {
    if (!selectedCategory) return [];
    const findCategory = (nodes: ProductCategory[], id: string): ProductCategory | null => {
      for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
          const found = findCategory(node.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    const category = findCategory(categories, selectedCategory);
    if (!category) return [selectedCategory];
    const getIds = (cat: ProductCategory): string[] => {
      let ids = [cat.id];
      if (cat.children) {
        cat.children.forEach(child => {
          ids = [...ids, ...getIds(child)];
        });
      }
      return ids;
    };
    return getIds(category);
  }, [selectedCategory, categories]);

  const flatCategoryOptions = useMemo(() => getFlatCategories(categories), [categories]);

  const categoryFields = [
    { key: 'name', label: '类别名称', required: true },
    { key: 'status', label: '状态', type: 'select', options: [{ value: '1', label: '启用' }, { value: '0', label: '禁用' }] },
    { key: 'fab.features', label: '产品特征 (Features)', type: 'textarea' },
    { key: 'fab.advantages', label: '产品优势 (Advantages)', type: 'textarea' },
    { key: 'fab.benefits', label: '客户利益 (Benefits)', type: 'textarea' },
  ];

  const handleSaveCategory = async (data: any) => {
    const isEditingExisting = Boolean(editingCategory?.id);
    const name = String(data.name || '').trim();
    if (!name) {
      toast.error('类别名称不能为空');
      return false;
    }

    try {
      const saved = await saveProductCategoryToSupabase({
        id: isEditingExisting ? String(editingCategory?.id || '') : '',
        name,
        parentId: editingCategory?.parentId || null,
        status: data.status !== undefined ? data.status : 1,
        fab: {
          features: data.fab?.features || '',
          advantages: data.fab?.advantages || '',
          benefits: data.fab?.benefits || ''
        },
        children: []
      }, { forceInsert: !isEditingExisting });
      await fetchCategories();
      setIsAddingCategory(false);
      setEditingCategory(null);
      toast.success('产品类别保存成功');
      return true;
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(`保存类别失败：${(error as Error)?.message || '请检查数据和配置后重试'}`);
      return false;
    }
  };

  const getAllDescendantIds = (nodes: ProductCategory[], parentId: string): string[] => {
    const result: string[] = [];
    const walk = (items: ProductCategory[]) => {
      items.forEach((item) => {
        if (item.parentId === parentId) {
          result.push(item.id);
          if (item.children?.length) {
            result.push(...getAllDescendantIds(item.children, item.id));
          }
        }
      });
    };
    walk(nodes);
    return result;
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (isDeletingCategory) return;
    if (!(await confirmDialog(`确认删除类别 "${categoryName}" 及其所有子类别吗？此操作不可撤销。`))) {
      return;
    }

    try {
      setIsDeletingCategory(true);
      const descendantIds = getAllDescendantIds(categories, categoryId);
      const deleteIds = [categoryId, ...descendantIds];
      const needResetSelection = selectedCategory && deleteIds.includes(selectedCategory);

      if (needResetSelection) {
        setSelectedCategory(null);
      }

      await Promise.all(deleteIds.map(id => deleteProductCategoryFromSupabase(id)));
      await fetchCategories();

      toast.success('产品类别删除成功');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(`删除类别失败：${(error as Error)?.message || '请检查数据和配置后重试'}`);
    } finally {
      setIsDeletingCategory(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.materialName.toLowerCase().includes(searchTerm.toLowerCase()) || p.materialNo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory ? selectedCategoryIds.includes(p.categoryId) : true;
    return matchesSearch && matchesCategory;
  });

  const getCategoryAttributes = (categoryId: string): CategoryAttribute[] => {
    const findCategory = (nodes: ProductCategory[], id: string): ProductCategory | null => {
      for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
          const found = findCategory(node.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    const category = findCategory(categories, categoryId);
    return category?.attributes || [];
  };

  const baseProductFields: { key: string; label: string; type?: string; options?: (string | { value: string; label: string })[]; required?: boolean }[] = [
    { key: 'imageUrl', label: '产品图片', type: 'image' },
    { key: 'materialNo', label: '物料编号', required: true },
    { key: 'materialName', label: '物料名称', required: true },
    { key: 'specification', label: '物料规格' },
    { key: 'categoryId', label: '产品类别编号', type: 'select', options: flatCategoryOptions.map(c => ({ value: c.id, label: `${c.id} - ${c.name}` })), required: true },
    { key: 'seriesId', label: '产品系列ID', type: 'select', options: seriesList.map(s => ({ value: s.id, label: `${s.seriesNo || s.id} - ${s.name}` })) },
    { key: 'basicUnit', label: '基本单位', required: true },
    { key: 'creationOrg', label: '创建组织' },
    { key: 'inventoryCategory', label: '存货类别' },
    { key: 'materialAttribute', label: '物料属性' },
    { key: 'allowNegativeInventory', label: '允许负库存', type: 'boolean' as const },
    { key: 'auxiliaryUnit', label: '辅助单位' },
    { key: 'auxiliaryAttributeManagement', label: '辅助属性管理', type: 'boolean' as const },
    { key: 'batchRule', label: '批号规则' },
    { key: 'enableBatchManagement', label: '启用批号管理', type: 'boolean' as const },
    { key: 'remarks', label: '备注' },
    { key: 'weightUnit', label: '重量单位' },
    { key: 'grossWeight', label: '毛重', type: 'number' as const },
    { key: 'netWeight', label: '净重', type: 'number' as const },
    { key: 'dimensionUnit', label: '尺寸单位' },
    { key: 'length', label: '长度', type: 'number' as const },
    { key: 'width', label: '宽度', type: 'number' as const },
    { key: 'height', label: '高度', type: 'number' as const },
    { key: 'volumeUnit', label: '容积单位' },
    { key: 'volume', label: '容积', type: 'number' as const },
    { key: 'isPurchasable', label: '可采购', type: 'boolean' as const },
    { key: 'isSalable', label: '可销售', type: 'boolean' as const },
    { key: 'isStorable', label: '可库存', type: 'boolean' as const },
    { key: 'isManufacturable', label: '可自制', type: 'boolean' as const },
    { key: 'isOutsourceable', label: '可委外', type: 'boolean' as const },
    { key: 'price', label: '价格', type: 'number' as const },
    { key: 'creatorName', label: '创建人' },
    { key: 'createDate', label: '创建日期' },
  ];

  const getProductFields = (product: Partial<Product> | null) => {
    const fields = [...baseProductFields];
    if (product?.categoryId) {
      const attrs = getCategoryAttributes(product.categoryId);
      attrs.forEach(attr => {
        fields.push({
          key: `attributes.${attr.id}`,
          label: attr.name,
          type: attr.type,
          options: attr.options?.map(opt => ({ value: opt, label: opt }))
        });
      });
    }
    return fields;
  };

  const handleSave = async (data: any) => {
    const payload: Product = { ...data };
    if (isAdding) {
      try {
        const saved = await saveProductToSupabase(payload);
        setProducts((prev) => [saved as Product, ...prev.filter((p) => p.id !== String((saved as Product).id))]);
        toast.success('产品新增成功');
        setIsAdding(false);
        await fetchProducts();
        return true;
      } catch (error) {
        console.error('Error adding product:', error);
        toast.error(`新增产品失败：${(error as Error)?.message || '请检查数据和配置后重试'}`);
        setIsAdding(true);
        return false;
      }
    }
    return false;
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (displayCount < filteredProducts.length) {
        setDisplayCount(prev => prev + 20);
      }
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteProductFromSupabase(productId);
      setProducts((prev) => prev.filter(p => p.id !== productId));
      toast.success('产品删除成功');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error(`删除产品失败：${(error as Error)?.message || '请检查 Supabase 配置'}`);
    }
  };

  const renderCategoryTree = (categories: ProductCategory[], level = 0) => {
    return categories.map(category => (
      <div key={category.id} className="space-y-1">
          <div 
            className={cn(
              "flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer group",
              selectedCategory === category.id 
                ? "bg-indigo-50 text-indigo-700 font-medium" 
                : "text-gray-600 hover:bg-gray-50"
            )}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
            onClick={() => setSelectedCategory(category.id)}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <FolderTree className={cn(
                "w-4 h-4 shrink-0",
                selectedCategory === category.id ? "text-indigo-500" : "text-gray-400"
              )} />
              <span className={cn(
                "truncate text-sm",
                category.status === 0 ? "line-through text-gray-400" : ""
              )}>{category.name}</span>
              {category.status === 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500 rounded shrink-0">已禁用</span>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingCategory({ ...category, children: [] });
                  setIsAddingCategory(true);
                }}
                className="p-1 text-gray-400 hover:text-indigo-600"
                title="编辑类别"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingCategory({
                    id: '',
                    name: '',
                    parentId: category.id,
                    status: 1,
                    fab: { features: '', advantages: '', benefits: '' },
                    children: []
                  });
                  setIsAddingCategory(true);
                }}
                className="p-1 text-gray-400 hover:text-indigo-600"
                title="新增子类别"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCategory(category.id, category.name);
                }}
                className="p-1 text-gray-400 hover:text-rose-600"
                title="删除类别"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        {category.children && renderCategoryTree(category.children, level + 1)}
      </div>
    ));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4 md:gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0 mb-2">
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold text-gray-900">产品管理</h2>
          <p className="text-sm text-gray-500 mt-1">管理产品资料及属性设置</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="搜索产品..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
            />
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm shadow-indigo-200 shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" />
            新增产品
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-6 overflow-hidden">
        {/* Left Sidebar - Categories */}
        <div className="w-full md:w-64 shrink-0 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-48 md:h-auto">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900 text-sm">产品类别</h3>
            <button
              onClick={() => {
                setEditingCategory({ id: '', name: '', parentId: null, status: 1, fab: { features: '', advantages: '', benefits: '' }, children: [] });
                setIsAddingCategory(true);
              }}
              className="p-1 hover:bg-gray-100 rounded text-gray-500"
              title="新增产品类别"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="p-2 flex-1 overflow-y-auto">
            {renderCategoryTree(categories)}
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex flex-col h-full overflow-hidden" onScroll={handleScroll}>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <th className="p-4 text-sm font-medium text-gray-500">物料编号</th>
                    <th className="p-4 text-sm font-medium text-gray-500">物料名称</th>
                    <th className="p-4 text-sm font-medium text-gray-500">物料规格</th>
                    <th className="p-4 text-sm font-medium text-gray-500">系列ID</th>
                    <th className="p-4 text-sm font-medium text-gray-500">基本单位</th>
                    <th className="p-4 text-sm font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.slice(0, displayCount).map(product => (
                    <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td
                        className="p-4 text-sm text-indigo-600 cursor-pointer hover:underline"
                        onClick={() => navigateTo?.('product-detail', { id: product.id, name: product.materialName, mode: 'view' })}
                      >
                        {product.materialNo}
                      </td>
                      <td className="p-4 text-sm text-gray-900">{product.materialName}</td>
                      <td className="p-4 text-sm text-gray-500">{product.specification}</td>
                      <td className="p-4 text-sm text-gray-500">{product.seriesId || '-'}</td>
                      <td className="p-4 text-sm text-gray-500">{product.basicUnit}</td>
                      <td className="p-4 text-sm">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigateTo?.('product-detail', { id: product.id, name: product.materialName, mode: 'edit' });
                            }}
                            className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                          >
                            <Edit2 className="w-4 h-4" />
                            编辑
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('确定要删除这个产品吗？')) {
                                handleDeleteProduct(product.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-800 flex items-center gap-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4 p-4 overflow-y-auto flex-1">
              {filteredProducts.slice(0, displayCount).map((product) => (
                <div 
                  key={product.id} 
                  className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3"
                  onClick={() => navigateTo?.('product-detail', { id: product.id, name: product.materialName, mode: 'view' })}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="font-bold text-gray-900">{product.materialName}</h3>
                      <p className="text-xs text-indigo-600 font-medium">{product.materialNo}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <div className="col-span-2">
                      <p className="text-gray-500 text-xs">规格型号</p>
                      <p className="text-gray-900">{product.specification}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">系列ID</p>
                      <p className="text-gray-900">{product.seriesId || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">基本单位</p>
                      <p className="text-gray-900">{product.basicUnit}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">存货类别</p>
                      <p className="text-gray-900">{product.inventoryCategory}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex justify-between">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('确定要删除这个产品吗？')) {
                          handleDeleteProduct(product.id);
                        }
                      }}
                      className="text-red-600 text-sm font-medium flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      删除
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateTo?.('product-detail', { id: product.id, name: product.materialName, mode: 'view' });
                      }}
                      className="text-indigo-600 text-sm font-medium"
                    >
                      详情
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateTo?.('product-detail', { id: product.id, name: product.materialName, mode: 'edit' });
                      }}
                      className="text-gray-600 text-sm font-medium"
                    >
                      编辑
                    </button>
                  </div>
                </div>
              ))}
              
              {displayCount < filteredProducts.length && (
                <div className="py-4 text-center text-gray-500 text-sm">
                  正在加载更多...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Product Add Modal */}
      {isAdding && (
        <DetailModal
          isOpen={true}
          onClose={() => {
            setIsAdding(false);
          }}
          title="新增产品"
          data={{}}
          fields={getProductFields({})}
          onSave={handleSave}
          isEditing={true}
        />
      )}

      {/* Category Add Modal */}
      {isAddingCategory && editingCategory && (
        <DetailModal
          isOpen={true}
          onClose={() => {
            setIsAddingCategory(false);
            setEditingCategory(null);
          }}
          title={editingCategory.parentId ? "新增子类别" : editingCategory.id && categories.some(c => c.id === editingCategory.id || c.children?.some(ch => ch.id === editingCategory.id)) ? "编辑产品类别" : "新增产品类别"}
          data={editingCategory}
          fields={categoryFields}
          onSave={handleSaveCategory}
          isEditing={true}
        />
      )}
    </div>
  );
}
