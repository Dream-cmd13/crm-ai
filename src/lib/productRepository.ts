import { mockProductCategories, mockProducts } from '../data';
import { Product, ProductCategory, ProductSeries } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const flattenCategories = (nodes: ProductCategory[]): ProductCategory[] => {
  const result: ProductCategory[] = [];
  const walk = (items: ProductCategory[], parentId: string | null = null) => {
    items.forEach((item) => {
      const current: ProductCategory = {
        ...item,
        parentId,
        children: undefined
      };
      result.push(current);
      if (item.children?.length) {
        walk(item.children, item.id);
      }
    });
  };
  walk(nodes);
  return result;
};

const buildCategoryTree = (rows: ProductCategory[]): ProductCategory[] => {
  const map = new Map<string, ProductCategory>();
  rows.forEach((row) => {
    map.set(row.id, { ...row, children: [] });
  });
  const roots: ProductCategory[] = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
};

const mapDbCategoryToUi = (row: any): ProductCategory => ({
  id: String(row.id || ''),
  name: row.name || '',
  parentId: row.parent_id ? String(row.parent_id) : null,
  image: row.image || '',
  fab: {
    features: row.fab_features || '',
    advantages: row.fab_advantages || '',
    benefits: row.fab_benefits || ''
  },
  attributes: []
});

const mapDbProductToUi = (row: any): Product => {
  let metadata: any = {};
  if (typeof row.status === 'string' && row.status.trim()) {
    try {
      metadata = JSON.parse(row.status);
    } catch {
      metadata = {};
    }
  }
  return {
    id: String(row.id || ''),
    categoryId: row.category_id ? String(row.category_id) : '',
    seriesId: metadata.seriesId || '',
    materialNo: row.material_no || '',
    materialName: row.material_name || '',
    specification: row.specification || '',
    basicUnit: row.unit || '',
    creationOrg: metadata.creationOrg || '',
    inventoryCategory: metadata.inventoryCategory || '',
    materialAttribute: metadata.materialAttribute || '',
    allowNegativeInventory: Boolean(metadata.allowNegativeInventory),
    enableBatchManagement: Boolean(metadata.enableBatchManagement),
    auxiliaryAttributeManagement: Boolean(metadata.auxiliaryAttributeManagement),
    isPurchasable: metadata.isPurchasable ?? true,
    isSalable: metadata.isSalable ?? true,
    isStorable: metadata.isStorable ?? true,
    isManufacturable: Boolean(metadata.isManufacturable),
    isOutsourceable: Boolean(metadata.isOutsourceable),
    attributes: metadata.attributes || {},
    imageUrl: metadata.imageUrl || undefined,
    price: Number(row.price || 0)
  } as Product;
};

const mapUiProductToDb = (product: Product) => ({
  id: product.id || `P${Date.now()}`,
  category_id: product.categoryId || null,
  material_no: product.materialNo || '',
  material_name: product.materialName || '',
  specification: product.specification || '',
  unit: product.basicUnit || '',
  price: (product as any).price || 0,
  status: JSON.stringify({
    creationOrg: product.creationOrg || '',
    seriesId: product.seriesId || '',
    inventoryCategory: product.inventoryCategory || '',
    materialAttribute: product.materialAttribute || '',
    allowNegativeInventory: Boolean(product.allowNegativeInventory),
    enableBatchManagement: Boolean(product.enableBatchManagement),
    auxiliaryAttributeManagement: Boolean(product.auxiliaryAttributeManagement),
    isPurchasable: product.isPurchasable ?? true,
    isSalable: product.isSalable ?? true,
    isStorable: product.isStorable ?? true,
    isManufacturable: Boolean(product.isManufacturable),
    isOutsourceable: Boolean(product.isOutsourceable),
    attributes: product.attributes || {},
    imageUrl: product.imageUrl || ''
  }),
  updated_at: new Date().toISOString()
});

export const fetchProductCategoriesFromSupabase = async (): Promise<ProductCategory[]> => {
  if (!isSupabaseConfigured()) return mockProductCategories;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('ba_cptype').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  const rows = (data || []).map(mapDbCategoryToUi);
  return buildCategoryTree(rows);
};

export const saveProductCategoryToSupabase = async (category: ProductCategory) => {
  if (!isSupabaseConfigured()) return category;
  const supabase = getSupabaseClient();
  const id = category.id || `CAT${Date.now()}`;
  const normalizedParentId = category.parentId && category.parentId !== id ? category.parentId : null;
  const payload = {
    id,
    parent_id: normalizedParentId,
    name: category.name,
    image: (category as any).image || null,
    fab_features: category.fab?.features || '',
    fab_advantages: category.fab?.advantages || '',
    fab_benefits: category.fab?.benefits || '',
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from('ba_cptype').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
  return { ...category, id };
};

export const saveAllProductCategoriesToSupabase = async (categories: ProductCategory[]) => {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  const flat = flattenCategories(categories);
  const validIds = new Set(flat.map((category) => category.id));
  const payload = flat.map((category) => ({
    id: category.id,
    parent_id:
      category.parentId &&
      category.parentId !== category.id &&
      validIds.has(category.parentId)
        ? category.parentId
        : null,
    name: category.name,
    image: (category as any).image || null,
    fab_features: category.fab?.features || '',
    fab_advantages: category.fab?.advantages || '',
    fab_benefits: category.fab?.benefits || '',
    updated_at: new Date().toISOString()
  }));
  const { error } = await supabase.from('ba_cptype').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
};

export const fetchProductsFromSupabase = async (): Promise<Product[]> => {
  if (!isSupabaseConfigured()) return mockProducts;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('ba_cpinfo').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapDbProductToUi);
};

export const fetchProductSeriesFromSupabase = async (): Promise<ProductSeries[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('crm_product_series').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: String(row.id || ''),
    name: row.name || '',
    categoryId: row.category_id ? String(row.category_id) : '',
    description: row.description || '',
    fab: {
      features: row.fab_features || '',
      advantages: row.fab_advantages || '',
      benefits: row.fab_benefits || ''
    }
  }));
};

export const saveProductSeriesToSupabase = async (series: ProductSeries) => {
  if (!isSupabaseConfigured()) return { ...series, id: series.id || `SER${Date.now()}` };
  const supabase = getSupabaseClient();
  const payload = {
    id: series.id || `SER${Date.now()}`,
    name: series.name || '',
    category_id: series.categoryId || null,
    description: series.description || '',
    fab_features: series.fab?.features || '',
    fab_advantages: series.fab?.advantages || '',
    fab_benefits: series.fab?.benefits || '',
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from('crm_product_series').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
  return { ...series, id: payload.id };
};

export const deleteProductSeriesFromSupabase = async (id: string) => {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('crm_product_series').delete().eq('id', id);
  if (error) throw error;
};

export const deleteProductCategoryFromSupabase = async (id: string) => {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('ba_cptype').delete().eq('id', id);
  if (error) throw error;
};

export const saveProductToSupabase = async (product: Product) => {
  if (!isSupabaseConfigured()) return { ...product, id: product.id || `P${Date.now()}` };
  const supabase = getSupabaseClient();
  const payload = mapUiProductToDb(product);
  const { error } = await supabase.from('ba_cpinfo').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
  return { ...product, id: payload.id };
};

export const deleteProductFromSupabase = async (id: string) => {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('ba_cpinfo').delete().eq('id', id);
  if (error) throw error;
};
