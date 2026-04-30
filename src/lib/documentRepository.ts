import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { updateCustomerLastContactInSupabase } from './customerRepository';

const mapItemToRow = (item: any, parentKey: string, parentId: number) => {
  const baseRow: Record<string, any> = {
    [parentKey]: parentId,
    product_id: item.productId || null,
    product_name: item.productName,
    material_no: item.materialNo,
    quantity: item.quantity || 0,
    tax_type: item.taxType,
    tax_rate: item.taxRate || 0,
    tax_included_price: item.taxIncludedPrice || 0,
    tax_excluded_price: item.taxExcludedPrice || 0,
    tax_included_amount: item.taxIncludedAmount || 0,
    tax_excluded_amount: item.taxExcludedAmount || 0,
    tax_amount: item.taxAmount || 0
  };
  if (parentKey === 'return_order_id') {
    baseRow.order_no = item.orderNo || null;
    baseRow.return_no = item.returnNo || null;
    baseRow.material_id = item.materialId || null;
    baseRow.material_name = item.materialName || item.productName || null;
    baseRow.expected_after_sale_method = item.expectedAfterSaleMethod || null;
    baseRow.after_sale_reason = item.afterSaleReason || null;
    baseRow.after_sale_material_image = item.afterSaleMaterialImage || null;
    baseRow.issue_description = item.issueDescription || null;
    baseRow.return_tracking_no = item.returnTrackingNo || null;
    baseRow.final_handling_method = item.finalHandlingMethod || null;
    baseRow.return_qty = item.returnQty ?? item.quantity ?? 0;
    baseRow.return_method = item.returnMethod || null;
  }
  return baseRow;
};

const DEFAULT_CATEGORY_NAME = 'Uncategorized';
const toNullableInt = (value: any): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
};
const toPersistedId = (value: any): number | null => {
  const parsed = toNullableInt(value);
  return parsed !== null && parsed > 0 ? parsed : null;
};
const normalizeQuotationStatus = (value: any): string => {
  const raw = String(value || '').trim();
  const allowed = new Set([
    'quotation_complete',
    'terminated',
    'manual_quotation',
    'timeout_cancellation',
    'user_cancelled'
  ]);
  if (allowed.has(raw)) return raw;
  const map: Record<string, string> = {
    '草稿': 'manual_quotation',
    '手动报价': 'manual_quotation',
    '已接受': 'quotation_complete',
    '已终止': 'terminated',
    '超时取消': 'timeout_cancellation',
    '用户取消': 'user_cancelled'
  };
  return map[raw] || 'manual_quotation';
};
const normalizeSalesOrderStatus = (value: any): string => {
  const raw = String(value || '').trim();
  const allowed = new Set([
    'un_paid', 'partial_payment', 'monthly_paid_audit', 'monthly_paid_audit_failed',
    'offline_payment_audit', 'offline_payment_audit_failed', 'waiting_delivery',
    'partial_delivery', 'delivered', 'await_comment', 'completed', 'not_submit',
    'cancellation', 'admin_cancellation', 'admin_cancellation_audit', 'system_cancel',
    'await_follow', 'await_refund', 'await_receipt_refund', 'completed_refund'
  ]);
  if (allowed.has(raw)) return raw;
  const map: Record<string, string> = {
    '草稿': 'not_submit',
    '未提交': 'not_submit',
    '待执行': 'not_submit',
    '待发货': 'waiting_delivery',
    '部分发货': 'partial_delivery',
    '已发货': 'delivered',
    '已完成': 'completed',
    '已取消': 'cancellation',
    '待跟进': 'await_follow'
  };
  return map[raw] || 'not_submit';
};
const normalizeSampleOrderStatus = (value: any): string => {
  const raw = String(value || '').trim();
  const allowed = new Set([
    'leader_reject',
    'wait_leader_examine',
    'completed',
    'stay_follow_up',
    'cancellation',
    'closure'
  ]);
  if (allowed.has(raw)) return raw;
  const map: Record<string, string> = {
    '待审核': 'wait_leader_examine',
    '已完成': 'completed',
    '待跟进': 'stay_follow_up',
    '已取消': 'cancellation',
    '已关闭': 'closure',
    '主管驳回': 'leader_reject'
  };
  return map[raw] || 'wait_leader_examine';
};
const resolveMaterialNo = (item: any) => {
  const raw = String(item?.materialNo || item?.customerMaterialNo || '').trim();
  if (raw) return raw;
  const pid = String(item?.productId || '').trim();
  return pid ? `AUTO-${pid}` : `AUTO-${Date.now()}`;
};

const ensureProductsForItems = async (supabase: any, items: any[]) => {
  const validItems = (items || []).filter((item) => item?.productId && item?.productName);
  if (validItems.length === 0) return;

  const requestedCategoryIds = Array.from(
    new Set(
      validItems
        .map((item) => toNullableInt(item.categoryId ?? item.productCategoryId))
        .filter((id): id is number => id !== null)
    )
  );

  const existingCategoryIdSet = new Set<number>();
  if (requestedCategoryIds.length > 0) {
    const { data: existingCategories, error: categoryError } = await supabase
      .from('ba_cptype')
      .select('id')
      .in('id', requestedCategoryIds);
    if (categoryError) throw categoryError;
    (existingCategories || []).forEach((row: any) => {
      const id = toNullableInt(row?.id);
      if (id !== null) existingCategoryIdSet.add(id);
    });
  }

  const productRows = validItems
    .map((item) => {
      const productId = toNullableInt(item.productId);
      if (productId === null) return null;
      const cid = toNullableInt(item.categoryId ?? item.productCategoryId);
      return {
        id: productId,
        category_id: cid !== null && existingCategoryIdSet.has(cid) ? cid : null,
        category_name: item.categoryName || item.productCategoryName || DEFAULT_CATEGORY_NAME,
        material_no: resolveMaterialNo(item),
        material_name: String(item.productName || item.materialName || '').trim() || 'Unnamed Material',
        specification: item.specification || '',
        unit: item.unit || 'PCS',
        price: Number(item.taxIncludedPrice || 0),
        updated_at: new Date().toISOString()
      };
    })
    .filter((row): row is Record<string, any> => row !== null);
  if (productRows.length === 0) return;
  const dedupedRows = Array.from(new Map(productRows.map((row) => [row.id, row])).values());
  const { error } = await supabase.from('ba_cpinfo').upsert(dedupedRows, { onConflict: 'id' });
  if (error) throw error;
};

const normalizeItemsWithValidProducts = async (supabase: any, items: any[]) => {
  const productIds = Array.from(
    new Set((items || []).map((item) => toNullableInt(item?.productId)).filter((id): id is number => id !== null))
  );
  if (productIds.length === 0) {
    return (items || []).map((item) => ({ ...item, productId: null }));
  }
  const { data, error } = await supabase.from('ba_cpinfo').select('id').in('id', productIds);
  if (error) throw error;
  const validProductIdSet = new Set((data || []).map((row: any) => toNullableInt(row.id)).filter((id: any) => id !== null));
  return (items || []).map((item) => ({
    ...item,
    productId: (() => {
      const productId = toNullableInt(item?.productId);
      return productId !== null && validProductIdSet.has(productId) ? productId : null;
    })()
  }));
};

const mapRowToItem = (row: any) => ({
  id: row.id,
  productId: row.product_id || '',
  productName: row.product_name || '',
  materialName: row.material_name || '',
  materialId: row.material_id || '',
  materialNo: row.material_no || '',
  quantity: Number(row.quantity || 0),
  taxType: row.tax_type || '澧炲€肩◣涓撶エ',
  taxRate: Number(row.tax_rate || 13),
  taxIncludedPrice: Number(row.tax_included_price || 0),
  taxExcludedPrice: Number(row.tax_excluded_price || 0),
  taxIncludedAmount: Number(row.tax_included_amount || 0),
  taxExcludedAmount: Number(row.tax_excluded_amount || 0),
  taxAmount: Number(row.tax_amount || 0),
  orderNo: row.order_no || '',
  returnNo: row.return_no || '',
  expectedAfterSaleMethod: row.expected_after_sale_method || '',
  afterSaleReason: row.after_sale_reason || '',
  afterSaleMaterialImage: row.after_sale_material_image || '',
  issueDescription: row.issue_description || '',
  returnTrackingNo: row.return_tracking_no || '',
  finalHandlingMethod: row.final_handling_method || '',
  returnQty: Number(row.return_qty || 0),
  returnMethod: row.return_method || ''
});

const fetchItemsMap = async (table: string, parentKey: string, parentIds: string[]) => {
  if (parentIds.length === 0) return new Map<string, any[]>();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from(table).select('*').in(parentKey, parentIds);
  if (error) throw error;
  const grouped = new Map<string, any[]>();
  (data || []).forEach((row: any) => {
    const key = row[parentKey];
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(mapRowToItem(row));
  });
  return grouped;
};

const saveWithItems = async (
  mainTable: string,
  itemTable: string,
  parentKey: string,
  id: number | null,
  mainRow: any,
  items: any[]
) => {
  const supabase = getSupabaseClient();
  await ensureProductsForItems(supabase, items);
  const normalizedItems = await normalizeItemsWithValidProducts(supabase, items);
  if (typeof mainRow.customer_id === 'string') {
    const normalizedCustomerId = mainRow.customer_id.trim();
    mainRow.customer_id = normalizedCustomerId || null;
  }
  if (mainRow.customer_id && mainRow.customer_name) {
    const { error: customerError } = await supabase.from('ba_manucustinfo').upsert(
      {
        id: mainRow.customer_id,
        name: mainRow.customer_name,
        status: 1,
        level: 'Normal',
        industry: 'Uncategorized',
        source: 7,
        region: null
      },
      { onConflict: 'id' }
    );
    if (customerError) throw customerError;
    await updateCustomerLastContactInSupabase(mainRow.customer_id, `${mainTable}鍗曟嵁鏇存柊`);
  }
  if (typeof mainRow.project_id === 'string') {
    const normalizedProjectId = mainRow.project_id.trim();
    mainRow.project_id = normalizedProjectId || null;
  }
  // 閬垮厤 project_id 澶栭敭鎶ラ敊锛氳嫢椤圭洰涓嶅瓨鍦ㄥ垯缃┖ project_id
  if (mainRow.project_id) {
    const { data: projectRow, error: projectError } = await supabase
      .from('crm_project')
      .select('id')
      .eq('id', mainRow.project_id)
      .maybeSingle();
    if (projectError) throw projectError;
    if (!projectRow) {
      mainRow.project_id = null;
    }
  }
  const { data: persistedRow, error: mainError } = await supabase
    .from(mainTable)
    .upsert(mainRow, { onConflict: 'id' })
    .select('id')
    .single();
  if (mainError) throw mainError;
  const persistedId = toPersistedId(persistedRow?.id);
  if (persistedId === null) throw new Error(`${mainTable} save succeeded but no numeric id returned`);
  const { error: deleteError } = await supabase.from(itemTable).delete().eq(parentKey, persistedId);
  if (deleteError) throw deleteError;
  if (normalizedItems.length > 0) {
    const rows = normalizedItems.map((item) => mapItemToRow(item, parentKey, persistedId));
    const { error: insertError } = await supabase.from(itemTable).insert(rows);
    if (insertError) throw insertError;
  }
  return persistedId;
};

export const fetchQuotationsFromSupabase = async (): Promise<any[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('crm_quotation').select('*').order('created_at', { ascending: false });
  if (error) throw error;

  const rows = data || [];
  const itemsMap = await fetchItemsMap('crm_quotation_item', 'quotation_id', rows.map((r: any) => r.id));
  return rows.map((row: any) => ({
    id: row.id,
    quoteNo: row.quote_no || '',
    customerId: row.customer_id || '',
    customerName: row.customer_name || '',
    projectId: row.project_id || '',
    projectName: row.project_name || '',
    quoteDate: row.quote_date || '',
    status: row.status || '鑽夌',
    taxIncludedTotalAmount: Number(row.tax_included_total_amount || 0),
    taxExcludedTotalAmount: Number(row.tax_excluded_total_amount || 0),
    totalAmount: Number(row.total_amount || 0),
    items: itemsMap.get(row.id) || [],
    auditStatus: row.audit_status || 'Pending',
    changeRecords: []
  }));
};

export const saveQuotationToSupabase = async (doc: any) => {
  if (!isSupabaseConfigured()) throw new Error('Supabase environment variables are not configured');
  const id = toPersistedId(doc.id);
  return await saveWithItems(
    'crm_quotation',
    'crm_quotation_item',
    'quotation_id',
    id,
    {
      ...(id !== null ? { id } : {}),
      quote_no: doc.quoteNo,
      customer_id: doc.customerId,
      customer_name: doc.customerName,
      project_id: doc.projectId,
      project_name: doc.projectName,
      quote_date: doc.quoteDate,
      status: normalizeQuotationStatus(doc.status),
      audit_status: doc.auditStatus,
      tax_included_total_amount: doc.taxIncludedTotalAmount || 0,
      tax_excluded_total_amount: doc.taxExcludedTotalAmount || 0,
      total_amount: doc.totalAmount || 0,
      updated_at: new Date().toISOString()
    },
    doc.items || []
  );
};

export const fetchSalesOrdersFromSupabase = async (): Promise<any[] | null> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('crm_sales_order').select('*').order('created_at', { ascending: false });
  if (error) throw error;

  const rows = data || [];
  const itemsMap = await fetchItemsMap('crm_sales_order_item', 'sales_order_id', rows.map((r: any) => r.id));
  return rows.map((row: any) => ({
    id: row.id,
    orderNo: row.order_no || '',
    customerId: row.customer_id || '',
    customerName: row.customer_name || '',
    projectId: row.project_id || '',
    projectName: row.project_name || '',
    orderDate: row.order_date || '',
    status: row.status || 'Pending',
    taxIncludedTotalAmount: Number(row.tax_included_total_amount || 0),
    taxExcludedTotalAmount: Number(row.tax_excluded_total_amount || 0),
    totalAmount: Number(row.total_amount || 0),
    items: itemsMap.get(row.id) || [],
    auditStatus: row.audit_status || 'Pending',
    changeRecords: []
  }));
};

export const saveSalesOrderToSupabase = async (doc: any) => {
  if (!isSupabaseConfigured()) throw new Error('Supabase environment variables are not configured');
  const id = toPersistedId(doc.id);
  return await saveWithItems(
    'crm_sales_order',
    'crm_sales_order_item',
    'sales_order_id',
    id,
    {
      ...(id !== null ? { id } : {}),
      order_no: doc.orderNo,
      customer_id: doc.customerId,
      customer_name: doc.customerName,
      project_id: doc.projectId,
      project_name: doc.projectName,
      order_date: doc.orderDate,
      status: normalizeSalesOrderStatus(doc.status),
      audit_status: doc.auditStatus,
      tax_included_total_amount: doc.taxIncludedTotalAmount || 0,
      tax_excluded_total_amount: doc.taxExcludedTotalAmount || 0,
      total_amount: doc.totalAmount || 0,
      updated_at: new Date().toISOString()
    },
    doc.items || []
  );
};

export const fetchSampleOrdersFromSupabase = async (): Promise<any[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('crm_sample_order').select('*').order('created_at', { ascending: false });
  if (error) throw error;

  const rows = data || [];
  const itemsMap = await fetchItemsMap('crm_sample_order_item', 'sample_order_id', rows.map((r: any) => r.id));
  return rows.map((row: any) => ({
    id: row.id,
    sampleNo: row.sample_no || '',
    customerId: row.customer_id || '',
    customerName: row.customer_name || '',
    applicant: row.applicant || '',
    projectId: row.project_id || '',
    projectName: row.project_name || '',
    createDate: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : '',
    status: row.status || 'Pending',
    totalAmount: Number(row.total_amount || 0),
    taxIncludedTotalAmount: Number(row.tax_included_total_amount || 0),
    taxExcludedTotalAmount: Number(row.tax_excluded_total_amount || 0),
    items: itemsMap.get(row.id) || [],
    auditStatus: row.audit_status || 'Pending',
    changeRecords: []
  }));
};

export const saveSampleOrderToSupabase = async (doc: any) => {
  if (!isSupabaseConfigured()) throw new Error('Supabase environment variables are not configured');
  const id = toPersistedId(doc.id);
  return await saveWithItems(
    'crm_sample_order',
    'crm_sample_order_item',
    'sample_order_id',
    id,
    {
      ...(id !== null ? { id } : {}),
      sample_no: doc.sampleNo,
      customer_id: doc.customerId,
      customer_name: doc.customerName,
      applicant: doc.applicant,
      project_id: doc.projectId,
      project_name: doc.projectName,
      status: normalizeSampleOrderStatus(doc.status),
      audit_status: doc.auditStatus,
      tax_included_total_amount: doc.taxIncludedTotalAmount || 0,
      tax_excluded_total_amount: doc.taxExcludedTotalAmount || 0,
      total_amount: doc.totalAmount || 0,
      updated_at: new Date().toISOString()
    },
    doc.items || []
  );
};

export const fetchReturnOrdersFromSupabase = async (): Promise<any[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('crm_return_order').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  const rows = data || [];
  const itemsMap = await fetchItemsMap('crm_return_order_item', 'return_order_id', rows.map((r: any) => r.id));
  return rows.map((row: any) => ({
    id: row.id,
    returnNo: row.return_no || '',
    orderNo: row.order_no || '',
    originalOrderNo: row.original_order_no || '',
    customerId: row.customer_id || '',
    customerName: row.customer_name || '',
    afterSaleQty: Number(row.after_sale_qty || 0),
    afterSaleType: row.after_sale_type || '',
    reason: row.reason || '',
    handler: row.handler || '',
    salesRep: row.sales_rep || '',
    merchandiser: row.merchandiser || '',
    projectId: row.project_id || '',
    projectName: row.project_name || '',
    createDate: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : '',
    status: row.status || 'Pending',
    taxIncludedTotalAmount: Number(row.tax_included_total_amount || 0),
    taxExcludedTotalAmount: Number(row.tax_excluded_total_amount || 0),
    items: itemsMap.get(row.id) || [],
    auditStatus: row.audit_status || 'Pending',
    changeRecords: []
  }));
};

export const saveReturnOrderToSupabase = async (doc: any) => {
  if (!isSupabaseConfigured()) throw new Error('Supabase environment variables are not configured');
  const id = toPersistedId(doc.id);
  return await saveWithItems(
    'crm_return_order',
    'crm_return_order_item',
    'return_order_id',
    id,
    {
      ...(id !== null ? { id } : {}),
      return_no: doc.returnNo,
      order_no: doc.orderNo,
      original_order_no: doc.originalOrderNo,
      customer_id: doc.customerId,
      customer_name: doc.customerName,
      after_sale_qty: doc.afterSaleQty ?? 0,
      after_sale_type: doc.afterSaleType,
      reason: doc.reason,
      handler: doc.handler,
      sales_rep: doc.salesRep,
      merchandiser: doc.merchandiser,
      project_id: doc.projectId,
      project_name: doc.projectName,
      status: doc.status,
      audit_status: doc.auditStatus,
      tax_included_total_amount: doc.taxIncludedTotalAmount || 0,
      tax_excluded_total_amount: doc.taxExcludedTotalAmount || 0,
      updated_at: new Date().toISOString()
    },
    doc.items || []
  );
};

const removeWithItems = async (
  mainTable: string,
  itemTable: string,
  parentKey: string,
  id: string
) => {
  if (!isSupabaseConfigured()) throw new Error('Supabase environment variables are not configured');
  const numericId = toPersistedId(id);
  if (numericId === null) return;
  const supabase = getSupabaseClient();
  const { error: itemDeleteError } = await supabase.from(itemTable).delete().eq(parentKey, numericId);
  if (itemDeleteError) throw itemDeleteError;
  const { error: mainDeleteError } = await supabase.from(mainTable).delete().eq('id', numericId);
  if (mainDeleteError) throw mainDeleteError;
};

export const deleteQuotationFromSupabase = async (id: string) => {
  await removeWithItems('crm_quotation', 'crm_quotation_item', 'quotation_id', id);
};

export const deleteSalesOrderFromSupabase = async (id: string) => {
  await removeWithItems('crm_sales_order', 'crm_sales_order_item', 'sales_order_id', id);
};

export const deleteSampleOrderFromSupabase = async (id: string) => {
  await removeWithItems('crm_sample_order', 'crm_sample_order_item', 'sample_order_id', id);
};

export const deleteReturnOrderFromSupabase = async (id: string) => {
  await removeWithItems('crm_return_order', 'crm_return_order_item', 'return_order_id', id);
};



