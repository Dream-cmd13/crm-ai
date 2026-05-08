import { Brand, Group, Product, ProductCategory, ProductLine, ProductSeries, ProductSpu, ProductSpuOption } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const toNullableInt = (value: any): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseInt(String(value).trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const tryParseJsonObject = (raw: any): Record<string, any> => {
  if (typeof raw !== 'string' || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

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
  status: row.status !== undefined ? row.status : 1,
  createDate: row.created_at || '',
  fab: {
    features: row.fab_features || '',
    advantages: row.fab_advantages || '',
    benefits: row.fab_benefits || ''
  },
  attributes: []
});

const mapDbSpuToUi = (row: any): ProductSpu => ({
  id: String(row.id || ''),
  name: row.name || '',
  brandId: row.brand_id ? String(row.brand_id) : '',
  categoryId: row.category_id ? String(row.category_id) : '',
  categoryName: row.category_name || '',
  createDate: row.created_at || ''
});

const mapDbBrandToUi = (row: any): Brand => ({
  id: String(row.id || ''),
  name: row.name || '',
  status: Number.parseInt(String(row.status ?? '1'), 10) || 1,
  createDate: row.created_at || ''
});

const mapDbGroupToUi = (row: any): Group => ({
  id: String(row.id || ''),
  name: row.name || '',
  manager: row.manager || '',
  createDate: row.created_at || ''
});

const mapDbProductLineToUi = (row: any): ProductLine => ({
  id: String(row.id || ''),
  parentId: row.parent_id ? String(row.parent_id) : null,
  name: row.name || '',
  manager: row.manager || '',
  createDate: row.created_at || '',
  children: []
});

const buildProductLineTree = (rows: ProductLine[]): ProductLine[] => {
  const map = new Map<string, ProductLine>();
  rows.forEach((row) => {
    map.set(row.id, { ...row, children: [] });
  });
  const roots: ProductLine[] = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children!.push(node);
      return;
    }
    roots.push(node);
  });
  return roots;
};

export interface PagedResult<T> {
  rows: T[];
  total: number;
}

const mapDbProductToUi = (row: any): Product => {
  // 新结构写入 specification_doc；兼容旧数据（曾错误写入 status 文本）
  const metadata = {
    ...tryParseJsonObject(row.specification_doc),
    ...tryParseJsonObject(row.status)
  };
  return {
    id: String(row.id || ''),
    categoryId: row.category_id ? String(row.category_id) : '',
    categoryName: row.category_name || '',
    seriesId: metadata.seriesId || '',
    materialNo: row.material_no || '',
    materialName: row.material_name || '',
    specification: row.specification || '',
    basicUnit: row.unit || '',
    price: Number(row.price || 0),
    minPrice: row.min_price !== null && row.min_price !== undefined ? Number(row.min_price) : undefined,
    status: row.status !== null && row.status !== undefined ? Number(row.status) : 1,
    brandId: row.brand_id ? String(row.brand_id) : '',
    brandName: row.brand_name || '',
    minPackQty: row.min_pack_qty !== null && row.min_pack_qty !== undefined ? Number(row.min_pack_qty) : undefined,
    minOrderQty: row.min_order_qty !== null && row.min_order_qty !== undefined ? Number(row.min_order_qty) : undefined,
    outsourceSupplierDrawing: row.outsource_supplier_drawing || '',
    drawing3d: row.drawing_3d || '',
    supplier: row.supplier || '',
    supplierNo: row.supplier_no || '',
    supplierMaterialNo: row.supplier_material_no || '',
    supplierMaterialName: row.supplier_material_name || '',
    productLineLevel1Id: row.product_line_level1_id ? String(row.product_line_level1_id) : '',
    productLineLevel2Id: row.product_line_level2_id ? String(row.product_line_level2_id) : '',
    productBelonging: row.product_belonging !== null && row.product_belonging !== undefined ? Number(row.product_belonging) : -1,
    groupId: row.group_id ? String(row.group_id) : '',
    groupName: row.group_name || '',
    outsourceCustomerDrawing: row.outsource_customer_drawing || '',
    customerOriginalDrawing: row.customer_original_drawing || '',
    changeDrawingDetail: row.change_drawing_detail || '',
    specificationDoc: row.specification_doc || '',
    inspectionStandard: row.inspection_standard || '',
    spuId: row.spu_id ? String(row.spu_id) : '',
    spuName: row.spu_name || '',
    platformMaterialNo: row.platform_material_no || '',
    materialLeadTime: row.material_lead_time !== null && row.material_lead_time !== undefined ? Number(row.material_lead_time) : undefined,
    packagingMethod: row.packaging_method || '',
    packagingSpec: row.packaging_spec || '',
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
    creatorName: row.creator_name || 'system',
    createDate: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : ''
  } as Product;
};

const mapUiProductToDb = (product: Product) => ({
  ...(toNullableInt(product.id) !== null ? { id: toNullableInt(product.id) } : {}),
  category_id: toNullableInt(product.categoryId),
  category_name: product.categoryName || null,
  material_no: product.materialNo || '',
  material_name: product.materialName || '',
  specification: product.specification || '',
  unit: product.basicUnit || '',
  price: product.price || 0,
  min_price: product.minPrice ?? null,
  status: product.status ?? 1,
  brand_id: toNullableInt(product.brandId),
  brand_name: product.brandName || null,
  min_pack_qty: product.minPackQty ?? 0,
  min_order_qty: product.minOrderQty ?? 0,
  outsource_supplier_drawing: product.outsourceSupplierDrawing || null,
  drawing_3d: product.drawing3d || null,
  supplier: product.supplier || null,
  supplier_no: product.supplierNo || null,
  supplier_material_no: product.supplierMaterialNo || null,
  supplier_material_name: product.supplierMaterialName || null,
  product_line_level1_id: toNullableInt(product.productLineLevel1Id),
  product_line_level2_id: toNullableInt(product.productLineLevel2Id),
  product_belonging: product.productBelonging ?? -1,
  group_id: toNullableInt(product.groupId),
  group_name: product.groupName || null,
  outsource_customer_drawing: product.outsourceCustomerDrawing || null,
  customer_original_drawing: product.customerOriginalDrawing || null,
  change_drawing_detail: product.changeDrawingDetail || null,
  inspection_standard: product.inspectionStandard || null,
  spu_id: toNullableInt(product.spuId),
  spu_name: product.spuName || null,
  platform_material_no: product.platformMaterialNo || null,
  material_lead_time: product.materialLeadTime ?? null,
  packaging_method: product.packagingMethod || null,
  packaging_spec: product.packagingSpec || null,
  specification_doc: JSON.stringify({
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
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('ba_cptype').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  const rows = (data || []).map(mapDbCategoryToUi);
  return buildCategoryTree(rows);
};

export const fetchBrandsFromSupabase = async (): Promise<ProductSpuOption[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('ba_brand')
    .select('id, name')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: String(row.id || ''),
    name: row.name || ''
  }));
};

export const fetchBrandListFromSupabase = async (
  keyword = '',
  page = 1,
  pageSize = 20
): Promise<PagedResult<Brand>> => {
  if (!isSupabaseConfigured()) return { rows: [], total: 0 };
  const supabase = getSupabaseClient();
  const currentPage = Math.max(1, Number(page) || 1);
  const currentPageSize = Math.max(1, Number(pageSize) || 20);
  const from = (currentPage - 1) * currentPageSize;
  const to = from + currentPageSize - 1;
  const normalizedKeyword = String(keyword || '').trim();

  let query = supabase.from('ba_brand').select('*', { count: 'exact' });
  if (normalizedKeyword) {
    query = query.ilike('name', `%${normalizedKeyword}%`);
  }
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
  if (error) throw error;
  return {
    rows: (data || []).map(mapDbBrandToUi),
    total: count || 0
  };
};

export const saveBrandToSupabase = async (brand: Brand): Promise<Brand> => {
  if (!isSupabaseConfigured()) throw new Error('Supabase 环境变量未配置');
  const supabase = getSupabaseClient();
  const normalizedId = toNullableInt(brand.id);
  const status = Number.parseInt(String(brand.status ?? 1), 10);
  const payload = {
    ...(normalizedId !== null ? { id: normalizedId } : {}),
    name: String(brand.name || '').trim(),
    status: Number.isNaN(status) ? 1 : status,
    updated_at: new Date().toISOString()
  };

  if (normalizedId === null) {
    const insertPayload = { ...payload };
    delete (insertPayload as any).id;
    const { data, error } = await supabase.from('ba_brand').insert(insertPayload).select('*').single();
    if (error) throw error;
    return mapDbBrandToUi(data);
  }

  const { data, error } = await supabase.from('ba_brand').update(payload).eq('id', normalizedId).select('*').single();
  if (error) throw error;
  return mapDbBrandToUi(data);
};

export const deleteBrandFromSupabase = async (id: string) => {
  if (!isSupabaseConfigured()) throw new Error('Supabase 环境变量未配置');
  const normalizedId = toNullableInt(id);
  if (normalizedId === null) throw new Error('品牌 ID 非法');
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('ba_brand').delete().eq('id', normalizedId);
  if (error) throw error;
};

export const fetchGroupListFromSupabase = async (
  keyword = '',
  page = 1,
  pageSize = 20
): Promise<PagedResult<Group>> => {
  if (!isSupabaseConfigured()) return { rows: [], total: 0 };
  const supabase = getSupabaseClient();
  const currentPage = Math.max(1, Number(page) || 1);
  const currentPageSize = Math.max(1, Number(pageSize) || 20);
  const from = (currentPage - 1) * currentPageSize;
  const to = from + currentPageSize - 1;
  const normalizedKeyword = String(keyword || '').trim();

  let query = supabase.from('ba_group').select('*', { count: 'exact' });
  if (normalizedKeyword) {
    query = query.ilike('name', `%${normalizedKeyword}%`);
  }
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
  if (error) throw error;
  return {
    rows: (data || []).map(mapDbGroupToUi),
    total: count || 0
  };
};

export const saveGroupToSupabase = async (group: Group): Promise<Group> => {
  if (!isSupabaseConfigured()) throw new Error('Supabase 环境变量未配置');
  const supabase = getSupabaseClient();
  const normalizedId = toNullableInt(group.id);
  const payload = {
    ...(normalizedId !== null ? { id: normalizedId } : {}),
    name: String(group.name || '').trim(),
    manager: String(group.manager || '').trim() || null,
    updated_at: new Date().toISOString()
  };

  if (normalizedId === null) {
    const insertPayload = { ...payload };
    delete (insertPayload as any).id;
    const { data, error } = await supabase.from('ba_group').insert(insertPayload).select('*').single();
    if (error) throw error;
    return mapDbGroupToUi(data);
  }

  const { data, error } = await supabase.from('ba_group').update(payload).eq('id', normalizedId).select('*').single();
  if (error) throw error;
  return mapDbGroupToUi(data);
};

export const deleteGroupFromSupabase = async (id: string) => {
  if (!isSupabaseConfigured()) throw new Error('Supabase 环境变量未配置');
  const normalizedId = toNullableInt(id);
  if (normalizedId === null) throw new Error('归属小组 ID 非法');
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('ba_group').delete().eq('id', normalizedId);
  if (error) throw error;
};

export const fetchProductLineListFromSupabase = async (
  keyword = '',
  page = 1,
  pageSize = 20
): Promise<PagedResult<ProductLine>> => {
  if (!isSupabaseConfigured()) return { rows: [], total: 0 };
  const supabase = getSupabaseClient();
  const currentPage = Math.max(1, Number(page) || 1);
  const currentPageSize = Math.max(1, Number(pageSize) || 20);
  const from = (currentPage - 1) * currentPageSize;
  const to = from + currentPageSize - 1;
  const normalizedKeyword = String(keyword || '').trim();

  let query = supabase.from('ba_product_line').select('*', { count: 'exact' });
  if (normalizedKeyword) {
    query = query.ilike('name', `%${normalizedKeyword}%`);
  }
  const { data, error, count } = await query.order('id', { ascending: true }).range(from, to);
  if (error) throw error;
  const rows = (data || []).map(mapDbProductLineToUi);
  return {
    rows: buildProductLineTree(rows),
    total: count || 0
  };
};

export const fetchAllProductLinesFromSupabase = async (): Promise<ProductLine[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('ba_product_line')
    .select('*')
    .order('id', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapDbProductLineToUi);
};

export const saveProductLineToSupabase = async (line: ProductLine): Promise<ProductLine> => {
  if (!isSupabaseConfigured()) throw new Error('Supabase 环境变量未配置');
  const supabase = getSupabaseClient();
  const normalizedId = toNullableInt(line.id);
  const normalizedParentId = toNullableInt(line.parentId);
  if (normalizedId !== null && normalizedParentId !== null && normalizedId === normalizedParentId) {
    throw new Error('产品线父级不能是自己');
  }
  const payload = {
    ...(normalizedId !== null ? { id: normalizedId } : {}),
    parent_id: normalizedParentId,
    name: String(line.name || '').trim(),
    manager: String(line.manager || '').trim() || null,
    updated_at: new Date().toISOString()
  };

  if (normalizedId === null) {
    const insertPayload = { ...payload };
    delete (insertPayload as any).id;
    const { data, error } = await supabase.from('ba_product_line').insert(insertPayload).select('*').single();
    if (!error) {
      return mapDbProductLineToUi(data);
    }
    // 兼容历史环境中序列未对齐导致的主键冲突（23505），回退为 max(id)+1 显式插入
    if (error.code === '23505') {
      const { data: maxRow, error: maxError } = await supabase
        .from('ba_product_line')
        .select('id')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (maxError) throw maxError;
      const nextId = Number(maxRow?.id || 0) + 1;
      const { data: retrySaved, error: retryError } = await supabase
        .from('ba_product_line')
        .insert({ ...insertPayload, id: nextId })
        .select('*')
        .single();
      if (retryError) throw retryError;
      return mapDbProductLineToUi(retrySaved);
    }
    throw error;
  }

  const { data, error } = await supabase
    .from('ba_product_line')
    .update(payload)
    .eq('id', normalizedId)
    .select('*')
    .single();
  if (error) throw error;
  return mapDbProductLineToUi(data);
};

export const deleteProductLineFromSupabase = async (id: string) => {
  if (!isSupabaseConfigured()) throw new Error('Supabase 环境变量未配置');
  const normalizedId = toNullableInt(id);
  if (normalizedId === null) throw new Error('产品线 ID 非法');
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('ba_product_line').delete().eq('id', normalizedId);
  if (error) throw error;
};

export const fetchProductCategoryOptionsFromSupabase = async (): Promise<ProductSpuOption[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('ba_cptype')
    .select('id, name')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: String(row.id || ''),
    name: row.name || ''
  }));
};

export const fetchProductSpuFromSupabase = async (): Promise<ProductSpu[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('ba_spu').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapDbSpuToUi);
};

export const saveProductSpuToSupabase = async (spu: ProductSpu): Promise<ProductSpu> => {
  if (!isSupabaseConfigured()) throw new Error('Supabase 环境变量未配置');
  const supabase = getSupabaseClient();
  const normalizedId = toNullableInt(spu.id);
  const payload = {
    ...(normalizedId !== null ? { id: normalizedId } : {}),
    name: String(spu.name || '').trim(),
    brand_id: toNullableInt(spu.brandId),
    category_id: toNullableInt(spu.categoryId),
    category_name: String(spu.categoryName || '').trim(),
    updated_at: new Date().toISOString()
  };

  if (normalizedId === null) {
    const insertPayload = { ...payload };
    delete (insertPayload as any).id;
    const { data, error } = await supabase.from('ba_spu').insert(insertPayload).select('*').single();
    if (error) throw error;
    return mapDbSpuToUi(data);
  }

  const { data, error } = await supabase.from('ba_spu').upsert(payload, { onConflict: 'id' }).select('*').single();
  if (error) throw error;
  return mapDbSpuToUi(data);
};

export const deleteProductSpuFromSupabase = async (id: string) => {
  if (!isSupabaseConfigured()) throw new Error('Supabase 环境变量未配置');
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('ba_spu').delete().eq('id', id);
  if (error) throw error;
};

export const saveProductCategoryToSupabase = async (
  category: ProductCategory,
  options?: { forceInsert?: boolean }
) => {
  if (!isSupabaseConfigured()) throw new Error('Supabase 环境变量未配置');
  const supabase = getSupabaseClient();
  const forceInsert = Boolean(options?.forceInsert);
  const id = forceInsert ? '' : category.id;
  const normalizedParentId = category.parentId && category.parentId !== id ? category.parentId : null;

  if (id) {
    const { data: existing, error: checkError } = await supabase.from('ba_cptype').select('id').eq('id', id).single();
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }
    
    if (existing) {
      const payload = {
        id,
        parent_id: normalizedParentId,
        name: category.name,
        image: (category as any).image || null,
        status: category.status !== undefined ? category.status : 1,
        fab_features: category.fab?.features || '',
        fab_advantages: category.fab?.advantages || '',
        fab_benefits: category.fab?.benefits || '',
        updated_at: new Date().toISOString()
      };
      const { data: saved, error } = await supabase.from('ba_cptype').update(payload).eq('id', id).select('id').single();
      if (error) throw error;
      return { ...category, id: saved?.id || id };
    }
    
    throw new Error(`类别 ID "${id}" 不存在，不允许创建具有相同 ID 的新类别，请使用空 ID 让系统自动生成`);
  }

  const payload = {
    parent_id: normalizedParentId,
    name: category.name,
    image: (category as any).image || null,
    status: category.status !== undefined ? category.status : 1,
    fab_features: category.fab?.features || '',
    fab_advantages: category.fab?.advantages || '',
    fab_benefits: category.fab?.benefits || '',
    updated_at: new Date().toISOString()
  };
  const { data: saved, error } = await supabase.from('ba_cptype').insert(payload).select('id').single();
  if (!error) {
    return { ...category, id: String(saved?.id || '') };
  }
  // 兼容历史环境中序列未对齐导致的主键冲突（23505），回退为 max(id)+1 显式插入
  if (error.code === '23505') {
    const { data: maxRow, error: maxError } = await supabase
      .from('ba_cptype')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (maxError) throw maxError;
    const nextId = Number(maxRow?.id || 0) + 1;
    const { data: retrySaved, error: retryError } = await supabase
      .from('ba_cptype')
      .insert({ ...payload, id: nextId })
      .select('id')
      .single();
    if (retryError) throw retryError;
    return { ...category, id: String(retrySaved?.id || nextId) };
  }
  throw error;
};

export const saveAllProductCategoriesToSupabase = async (categories: ProductCategory[]) => {
  if (!isSupabaseConfigured()) throw new Error('Supabase 环境变量未配置');
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
    status: category.status !== undefined ? category.status : 1,
    fab_features: category.fab?.features || '',
    fab_advantages: category.fab?.advantages || '',
    fab_benefits: category.fab?.benefits || '',
    updated_at: new Date().toISOString()
  }));
  const { error } = await supabase.from('ba_cptype').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
};

export const fetchProductsFromSupabase = async (): Promise<Product[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('ba_cpinfo').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapDbProductToUi);
};

export const fetchProductByIdFromSupabase = async (id: string): Promise<Product | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseClient();
  const normalizedId = toNullableInt(id);
  let query = supabase.from('ba_cpinfo').select('*').limit(1);
  query = normalizedId === null ? query.eq('id', String(id).trim()) : query.eq('id', normalizedId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapDbProductToUi(data);
};

export const fetchProductSeriesFromSupabase = async (): Promise<ProductSeries[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('crm_product_series').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: String(row.id || ''),
    seriesNo: row.series_no || '',
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
  if (!isSupabaseConfigured()) throw new Error('Supabase 环境变量未配置');
  const supabase = getSupabaseClient();
  const rawId = String(series.id || '').trim();
  const payload = {
    ...(rawId ? { id: rawId } : {}),
    series_no: series.seriesNo || '',
    name: series.name || '',
    category_id: series.categoryId || null,
    description: series.description || '',
    fab_features: series.fab?.features || '',
    fab_advantages: series.fab?.advantages || '',
    fab_benefits: series.fab?.benefits || '',
    updated_at: new Date().toISOString()
  };
  const { data, error } = await supabase
    .from('crm_product_series')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) throw error;
  return {
    id: String(data?.id || rawId),
    seriesNo: data?.series_no || series.seriesNo || '',
    name: data?.name || series.name || '',
    categoryId: data?.category_id ? String(data.category_id) : '',
    description: data?.description || '',
    fab: {
      features: data?.fab_features || '',
      advantages: data?.fab_advantages || '',
      benefits: data?.fab_benefits || ''
    }
  } as ProductSeries;
};

export const deleteProductSeriesFromSupabase = async (id: string) => {
  if (!isSupabaseConfigured()) throw new Error('Supabase 环境变量未配置');
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('crm_product_series').delete().eq('id', id);
  if (error) throw error;
};

export const fetchProductCategoryByIdFromSupabase = async (id: string): Promise<ProductCategory | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseClient();
  const normalizedId = toNullableInt(id);
  let query = supabase.from('ba_cptype').select('*').limit(1);
  query = normalizedId === null ? query.eq('id', String(id).trim()) : query.eq('id', normalizedId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapDbCategoryToUi(data);
};

export const deleteProductCategoryFromSupabase = async (id: string) => {
  if (!isSupabaseConfigured()) throw new Error('Supabase 环境变量未配置');
  const normalizedId = toNullableInt(id);
  if (normalizedId === null) throw new Error('产品类别 ID 非法');
  const supabase = getSupabaseClient();

  // 先做引用检查，避免直接触发外键报错导致用户无法理解
  const [{ count: spuRefCount, error: spuCountError }, { count: childCount, error: childCountError }] = await Promise.all([
    supabase.from('ba_spu').select('id', { count: 'exact', head: true }).eq('category_id', normalizedId),
    supabase.from('ba_cptype').select('id', { count: 'exact', head: true }).eq('parent_id', normalizedId)
  ]);
  if (spuCountError) throw spuCountError;
  if (childCountError) throw childCountError;
  if ((spuRefCount || 0) > 0) {
    throw new Error(`当前类别已被 ${(spuRefCount || 0)} 条 SPU 记录引用，请先修改这些 SPU 的类别后再删除`);
  }
  if ((childCount || 0) > 0) {
    throw new Error(`当前类别下仍有 ${(childCount || 0)} 个子类别，请先删除或迁移子类别后再删除`);
  }

  const { error } = await supabase.from('ba_cptype').delete().eq('id', normalizedId);
  if (error) {
    // 兜底处理：并发场景下仍可能触发外键约束
    if (error.code === '23503') {
      throw new Error('当前类别存在关联数据，无法删除；请先清理相关 SPU 或子类别');
    }
    throw error;
  }
};

export const saveProductToSupabase = async (product: Product) => {
  if (!isSupabaseConfigured()) throw new Error('Supabase 环境变量未配置');
  const supabase = getSupabaseClient();
  const payload = mapUiProductToDb(product);
  const normalizedId = toNullableInt(product.id);
  if (normalizedId === null) {
    const insertPayload = { ...payload };
    delete (insertPayload as any).id;
    const { data, error } = await supabase.from('ba_cpinfo').insert(insertPayload).select('*').single();
    if (!error) {
      return mapDbProductToUi(data);
    }
    // 兼容历史环境中序列未对齐导致的主键冲突（23505），回退为 max(id)+1 显式插入
    if (error.code === '23505') {
      const { data: maxRow, error: maxError } = await supabase
        .from('ba_cpinfo')
        .select('id')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (maxError) throw maxError;
      const nextId = Number(maxRow?.id || 0) + 1;
      const { data: retrySaved, error: retryError } = await supabase
        .from('ba_cpinfo')
        .insert({ ...insertPayload, id: nextId })
        .select('*')
        .single();
      if (retryError) throw retryError;
      return mapDbProductToUi(retrySaved);
    }
    throw error;
  }

  const { data, error } = await supabase.from('ba_cpinfo').upsert(payload, { onConflict: 'id' }).select('*').single();
  if (error) throw error;
  return mapDbProductToUi(data);
};

export const deleteProductFromSupabase = async (id: string) => {
  if (!isSupabaseConfigured()) throw new Error('Supabase 环境变量未配置');
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('ba_cpinfo').delete().eq('id', id);
  if (error) throw error;
};
