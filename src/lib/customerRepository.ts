import { CommunicationDetail, Customer, CustomerPersona, TodoTask } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const visitFallback: TodoTask[] = [];

// 辅助函数：将 UI 客户 ID 转换为数据库 customer_number
// 支持 CUS- 和 CUST- 两种前缀格式
const toCustomerNumber = (id: string | undefined): string | null => {
  if (!id || id.trim() === '') {
    // 由数据库触发器生成客户编号
    return null;
  }
  if (id.startsWith('CUS-')) return id;
  if (id.startsWith('CUST-')) return id.slice(1);
  return id;
};

// 辅助函数：从 customer_number 转换回 UI ID
const fromCustomerNumber = (customerNumber: string): string => {
  // 数据库已经存储完整格式 CUS-YYYYMMDD-XXX
  if (!customerNumber) return '';
  if (customerNumber.startsWith('CUS-')) return customerNumber;
  if (customerNumber.startsWith('UST-')) return `C${customerNumber}`;
  return customerNumber;
};

const mapDbCustomerToUi = (row: any): Customer => ({
  id: String(row.id || ''),
  customerNumber: row.customer_number || '',
  name: row.name || '',
  level: row.level || '普通客户',
  status: row.status === 1 ? '活跃' : row.status === 2 ? '休眠' : row.status === 3 ? '流失' : '活跃',
  industry: row.industry || '',
  source: row.source ? String(row.source) : '',
  region: row.region ? String(row.region) : '',
  salesRep: row.sales_rep || '',
  paymentTerm: row.payment_term ? String(row.payment_term) : '',
  hasPaymentTerm: Boolean(row.has_payment_term),
  customerType: row.customer_type ? String(row.customer_type) : '',
  merchandiser: row.merchandiser || row.merchandiser_id || row.merchandiser_name || '',
  isPublicPool: Boolean(row.is_public_pool),
  monthSettlementApplyStatus: row.month_settlement_apply_status || '',
  businessManager: row.business_manager || '',
  currency: row.currency || '',
  customerCategory: row.customer_category ? String(row.customer_category) : '',
  groupName: row.group_name || '',
  isListedCompany: Boolean(row.is_listed_company),
  shortName: row.short_name || '',
  englishName: row.english_name || '',
  insuredCount: typeof row.insured_count === 'number' ? row.insured_count : undefined,
  paidInCapital: row.paid_in_capital || '',
  lastVisitDate: row.last_visit_date || '',
  lastContactTime: row.last_contact_time || '',
  lastContactAction: row.last_contact_action || '',
  legalPerson: row.legal_person || '',
  registeredCapital: row.registered_capital || '',
  industryLevel1: row.industry_level_1 || '',
  industryLevel2: row.industry_level_2 || '',
  industryLevel3: row.industry_level_3 || '',
  employeeCount: row.employee_count || '',
  establishmentDate: row.establishment_date || '',
  unifiedSocialCreditCode: row.unified_social_credit_code || '',
  companyAddress: row.company_address || '',
  companyType: row.company_type || '',
  faxNumber: row.fax_number || '',
  monthSettlementAttachment: row.month_settlement_attachment || '',
  monthSettlementAgreement: row.month_settlement_agreement || '',
  businessScope: row.business_scope || '',
  website: row.website || '',
  contacts: [],
  followUps: [],
  creatorId: 'system',
  creatorNo: 'system',
  creatorName: 'system',
  createDate: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
});

const mapDbPersonaToUi = (row: any): CustomerPersona => ({
  id: row.id,
  customerId: row.customer_id,
  scale: row.scale || '',
  mainProducts: row.main_products || '',
  orgStructure: row.org_structure || '',
  buyingMode: row.buying_mode || undefined,
  painPoints: row.pain_points || '',
  competitiveLandscape: {
    supplier: row.competitive_supplier || '',
    preference: row.competitive_preference || ''
  },
  uniqueNeeds: row.unique_needs || '',
  rdRequirements: row.rd_requirements || '',
  sampleRequirements: row.sample_requirements || '',
  productionRequirements: row.production_requirements || '',
  lastUpdated: row.last_updated || new Date().toISOString().split('T')[0]
});

const mapDbVisitTaskToUi = (row: any): TodoTask => ({
  id: row.id,
  title: row.title || '',
  description: row.description || '',
  status: (row.status || '待办') as TodoTask['status'],
  importance: (row.importance || '中') as TodoTask['importance'],
  urgency: (row.urgency || '正常') as TodoTask['urgency'],
  assignee: row.assignee_name || '',
  dueDate: row.due_date || '',
  createDate: row.create_date || new Date().toISOString().split('T')[0],
  creatorId: row.creator_id || 'system',
  creatorNo: 'system',
  creatorName: row.creator_name || 'system',
  taskType: row.task_type || (row.module === 'customer_visit' ? '客户拜访' : '任务'),
  sourceType: (row.source_type || (row.module === 'customer_visit' ? 'visit' : 'manual')) as TodoTask['sourceType'],
  sourceId: row.source_id || row.related_id || '',
  associatedCustomerId: row.related_id || '',
  associatedCustomerName: '',
  visitType: row.task_type === '客户激活任务' ? undefined : '现场拜访',
  objectives: row.auxiliary_json?.objectives || undefined,
  auxiliaryData: row.auxiliary_json || undefined
});

const mapUiCustomerToDb = (customer: Customer) => {
  const customerNumber = customer.customerNumber || toCustomerNumber(customer.id);
  return {
    customer_number: customerNumber,
    name: customer.name || '',
    level: customer.level || '普通客户',
    status: customer.status === '活跃' ? 1 : customer.status === '休眠' ? 2 : customer.status === '流失' ? 3 : 1,
    industry: customer.industry || '',
    source: customer.source ? parseInt(customer.source, 10) || null : null,
    region: customer.region ? parseInt(customer.region, 10) || null : null,
    sales_rep: customer.salesRep || '',
    payment_term: customer.paymentTerm ? parseInt(customer.paymentTerm, 10) || null : null,
    has_payment_term: customer.hasPaymentTerm ? 1 : 0,
    customer_type: customer.customerType ? parseInt(customer.customerType, 10) || null : null,
    merchandiser: customer.merchandiser || '',
    is_public_pool: customer.isPublicPool ? true : false,
    month_settlement_apply_status: customer.monthSettlementApplyStatus ? parseInt(customer.monthSettlementApplyStatus, 10) || 0 : 0,
    business_manager: customer.businessManager || '',
    currency: customer.currency || '',
    currency_id: null,
    customer_category: customer.customerCategory ? parseInt(customer.customerCategory, 10) || null : null,
    group_name: customer.groupName || '',
    is_listed_company: customer.isListedCompany ? true : false,
    short_name: customer.shortName || '',
    english_name: customer.englishName || '',
    insured_count: typeof customer.insuredCount === 'number' ? customer.insuredCount : null,
    paid_in_capital: customer.paidInCapital || '',
    last_visit_date: customer.lastVisitDate || null,
    last_contact_time: customer.lastContactTime || null,
    last_contact_action: customer.lastContactAction || null,
    legal_person: customer.legalPerson || '',
    registered_capital: customer.registeredCapital || '',
    industry_level_1: customer.industryLevel1 || '',
    industry_level_2: customer.industryLevel2 || '',
    industry_level_3: customer.industryLevel3 || '',
    employee_count: customer.employeeCount || '',
    establishment_date: customer.establishmentDate || null,
    unified_social_credit_code: customer.unifiedSocialCreditCode || '',
    company_address: customer.companyAddress || '',
    company_type: customer.companyType || '',
    fax_number: customer.faxNumber || '',
    month_settlement_attachment: customer.monthSettlementAttachment || '',
    month_settlement_agreement: customer.monthSettlementAgreement || '',
    business_scope: customer.businessScope || '',
    website: customer.website || '',
    updated_at: new Date().toISOString()
  };
};

const mapUiPersonaToDb = (persona: CustomerPersona) => ({
  id: persona.id || crypto.randomUUID(),
  customer_id: persona.customerId,
  scale: persona.scale || '',
  main_products: persona.mainProducts || '',
  org_structure: persona.orgStructure || '',
  buying_mode: persona.buyingMode || '',
  pain_points: persona.painPoints || '',
  competitive_supplier: persona.competitiveLandscape?.supplier || '',
  competitive_preference: persona.competitiveLandscape?.preference || '',
  unique_needs: persona.uniqueNeeds || '',
  rd_requirements: persona.rdRequirements || '',
  sample_requirements: persona.sampleRequirements || '',
  production_requirements: persona.productionRequirements || '',
  last_updated: persona.lastUpdated || new Date().toISOString().split('T')[0],
  updated_at: new Date().toISOString()
});

const mapDbCommunicationToUi = (row: any): CommunicationDetail => ({
  id: String(row.id || ''),
  date: String(row.date || row.created_at || ''),
  sender: String(row.sender || ''),
  content: String(row.content || ''),
  type: ((row.type || 'phone') as CommunicationDetail['type']),
  attachmentUrl: row.attachment_url || undefined,
  duration: typeof row.duration === 'number' ? row.duration : undefined,
  sourceId: row.source_id || undefined,
  customerId: row.customer_id || undefined,
  sourceGroup: row.source_group || undefined
});

const normalizeContactTimeToIso = (raw: string): string => {
  const value = String(raw || '').trim();
  if (!value) return new Date().toISOString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00:00.000Z`;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  const fallbackParsed = new Date(value.replace(' ', 'T'));
  if (!Number.isNaN(fallbackParsed.getTime())) return fallbackParsed.toISOString();
  return new Date().toISOString();
};

export const fetchCustomersModuleDataFromSupabase = async (): Promise<{
  customers: Customer[];
  personas: CustomerPersona[];
  visitPlans: TodoTask[];
}> => {
  if (!isSupabaseConfigured()) {
    return { customers: [], personas: [], visitPlans: visitFallback };
  }
  const supabase = getSupabaseClient();
  const [{ data: customerRows, error: customerError }, { data: contactRows, error: contactError }, { data: followRows, error: followError }, { data: personaRows, error: personaError }, { data: taskRows, error: taskError }] = await Promise.all([
    supabase.from('ba_manucustinfo').select('*').order('created_at', { ascending: false }),
    supabase.from('crm_customer_contact').select('*'),
    supabase.from('crm_communication_log').select('*').eq('source_group', 'customer_followup').order('created_at', { ascending: false }),
    supabase.from('crm_customer_persona').select('*').order('updated_at', { ascending: false }),
    supabase.from('crm_task').select('*').eq('module', 'customer_visit').order('create_date', { ascending: false })
  ]);
  if (customerError) throw customerError;
  if (contactError) throw contactError;
  if (followError) throw followError;
  if (personaError) throw personaError;
  if (taskError) throw taskError;

  const customers = (customerRows || []).map(mapDbCustomerToUi);
  const contactMap = new Map<string, any[]>();
  (contactRows || []).forEach((row) => {
    if (!contactMap.has(row.customer_id)) contactMap.set(row.customer_id, []);
    contactMap.get(row.customer_id)!.push({
      id: row.id,
      name: row.name || '',
      position: row.position || '',
      department: row.department || '',
      phone: row.phone || '',
      email: row.email || '',
      wechatId: row.wechat_id || '',
      isPrimary: Boolean(row.is_primary),
      buyingRole: row.buying_role || '',
      buyingMode: row.buying_mode || '',
      appellation: row.appellation || ''
    });
  });
  const followMap = new Map<string, any[]>();
  (followRows || []).forEach((row) => {
    if (!followMap.has(row.customer_id)) followMap.set(row.customer_id, []);
    followMap.get(row.customer_id)!.push({
      id: row.id,
      date: row.date || '',
      type: row.type || '跟进',
      content: row.content || '',
      author: row.sender || ''
    });
  });
  const mergedCustomers = customers.map((customer) => ({
    ...customer,
    contacts: contactMap.get(customer.id) || [],
    followUps: followMap.get(customer.id) || []
  }));

  return {
    customers: mergedCustomers,
    personas: (personaRows || []).map(mapDbPersonaToUi),
    visitPlans: (taskRows || []).map(mapDbVisitTaskToUi)
  };
};

export const fetchCustomerCommunicationsFromSupabase = async (customerId: string): Promise<CommunicationDetail[]> => {
  if (!customerId || !isSupabaseConfigured()) return [];
  const dbId = await resolveCustomerDbIdFromSupabase(customerId);
  if (!dbId) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('crm_communication_log')
    .select('*')
    .eq('customer_id', dbId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapDbCommunicationToUi);
};

export const saveCustomerCommunicationToSupabase = async (
  customerId: string,
  comm: Partial<CommunicationDetail>
): Promise<CommunicationDetail | null> => {
  const id = String(customerId || '').trim();
  if (!id) throw new Error('缺少客户ID，无法保存沟通记录');
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseClient();
  const now = new Date();
  const payload = {
    id: String(comm.id || crypto.randomUUID()),
    source_id: String(comm.sourceId || id),
    customer_id: id,
    date: String(comm.date || now.toISOString()),
    sender: String(comm.sender || ''),
    content: String(comm.content || ''),
    type: String(comm.type || 'phone'),
    attachment_url: comm.attachmentUrl || null,
    duration: typeof comm.duration === 'number' ? comm.duration : null,
    source_group: comm.sourceGroup || null
  };
  const { data, error } = await supabase
    .from('crm_communication_log')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) throw error;
  await updateCustomerLastContactInSupabase(id, '沟通记录更新');
  return mapDbCommunicationToUi(data);
};

export const searchCustomersByNameFromSupabase = async (name: string, limit: number = 20): Promise<Customer[]> => {
  if (!isSupabaseConfigured()) return [];
  const q = (name || '').trim();
  if (!q) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('ba_manucustinfo')
    .select('*')
    .ilike('name', `%${q}%`)
    .not('level', 'eq', '潜在客户')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(mapDbCustomerToUi);
};

export const saveCustomersSnapshotToSupabase = async (customers: Customer[]): Promise<Customer[]> => {
  if (!isSupabaseConfigured()) return customers;
  const supabase = getSupabaseClient();
  
  // Create a mapping from customer_number to database ID by querying existing customers
  const { data: existingCustomers, error: fetchError } = await supabase
    .from('ba_manucustinfo')
    .select('id, customer_number');
  if (fetchError) throw fetchError;
  
  const customerNumberToId = new Map<string, number>();
  (existingCustomers || []).forEach(row => {
    customerNumberToId.set(row.customer_number, row.id);
  });
  
  // Track newly inserted customers and their generated IDs
  const newCustomerMap = new Map<string, string>(); // original index -> generated customer_number
  
  // Insert/update customers
  const customerRows = customers.map((customer, index) => {
    const customerNumber = customer.customerNumber || toCustomerNumber(customer.id);
    return {
      ...mapUiCustomerToDb(customer),
      customer_number: customerNumber,
      _originalIndex: index // Track original index for mapping back
    };
  });
  
  // Process each customer individually
  for (const row of customerRows) {
    const originalIndex = row._originalIndex;
    delete row._originalIndex;
    
    // Try to find by id first if it's numeric
    const customerId = customers[originalIndex].id;
    const isNumericId = /^\d+$/.test(customerId);
    
    if (isNumericId) {
      // Update existing customer by integer ID
      await supabase
        .from('ba_manucustinfo')
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq('id', parseInt(customerId, 10));
    } else {
      // Try to find by customer_number
      const existingId = customerNumberToId.get(row.customer_number);
      if (existingId) {
        await supabase
          .from('ba_manucustinfo')
          .update({ ...row, updated_at: new Date().toISOString() })
          .eq('id', existingId);
      } else {
        // Insert new customer
        const { data: inserted, error } = await supabase
          .from('ba_manucustinfo')
          .insert(row)
          .select('id, customer_number')
          .single();
        if (error) throw error;
        customerNumberToId.set(inserted.customer_number, inserted.id);
        newCustomerMap.set(String(originalIndex), String(inserted.id));
        // Also update customerNumber in the local map if needed
        customers[originalIndex].customerNumber = inserted.customer_number;
      }
    }
  }
  
  // 仅在有新客户编号回填时返回新数组，避免无变化时触发上层重复 setState 导致列表抖动
  let hasGeneratedIdPatched = false;
  const updatedCustomers = customers.map((customer, index) => {
    const generatedId = newCustomerMap.get(String(index));
    if (generatedId && !/^\d+$/.test(customer.id)) {
      hasGeneratedIdPatched = true;
      return { ...customer, id: generatedId };
    }
    return customer;
  });
  
  // Insert/update contacts using the database customer IDs
  const contactRows = customers.flatMap((customer) => {
    const isNumericId = /^\d+$/.test(customer.id);
    let dbCustomerId: number | undefined;
    
    if (isNumericId) {
      dbCustomerId = parseInt(customer.id, 10);
    } else {
      const customerNumber = customer.customerNumber || toCustomerNumber(customer.id);
      dbCustomerId = customerNumberToId.get(customerNumber);
    }
    
    if (!dbCustomerId) return [];
    
    return (customer.contacts || []).map((contact) => ({
      id: contact.id || crypto.randomUUID(),
      customer_id: dbCustomerId,
      name: contact.name || '',
      position: contact.position || '',
      department: contact.department || '',
      phone: contact.phone || '',
      email: contact.email,
      wechat_id: contact.wechatId || '',
      is_primary: Boolean(contact.isPrimary),
      buying_role: contact.buyingRole || '',
      buying_mode: contact.buyingMode || '',
      appellation: contact.appellation || '',
      updated_at: new Date().toISOString()
    }));
  });
  if (contactRows.length > 0) {
    const { error: insertContactError } = await supabase.from('crm_customer_contact').upsert(contactRows, { onConflict: 'id' });
    if (insertContactError) throw insertContactError;
  }

  // Insert/update follow-ups using the database customer IDs
  const followRows = customers.flatMap((customer) => {
    const customerNumber = toCustomerNumber(customer.id);
    const dbCustomerId = customerNumberToId.get(customerNumber);
    if (!dbCustomerId) return [];
    
    return (customer.followUps || []).map((follow) => ({
      id: follow.id || crypto.randomUUID(),
      source_id: String(dbCustomerId),
      customer_id: dbCustomerId,
      date: follow.date || '',
      sender: follow.author || '',
      content: follow.content || '',
      type: follow.type || '跟进',
      source_group: 'customer_followup'
    }));
  });
  if (followRows.length > 0) {
    const { error: insertFollowError } = await supabase.from('crm_communication_log').upsert(followRows, { onConflict: 'id' });
    if (insertFollowError) throw insertFollowError;
    const latestFollowByCustomer = new Map<string, string>();
    followRows.forEach((row) => {
      const cid = String(row.customer_id || '').trim();
      if (!cid) return;
      const date = String(row.date || '').trim();
      if (!date) return;
      if (!latestFollowByCustomer.has(cid) || String(latestFollowByCustomer.get(cid)) < date) {
        latestFollowByCustomer.set(cid, date);
      }
    });
    for (const [cid, date] of latestFollowByCustomer.entries()) {
      await updateCustomerLastContactInSupabase(cid, '沟通跟进记录', normalizeContactTimeToIso(date));
    }
  }

  return hasGeneratedIdPatched ? updatedCustomers : customers;
}

export const savePersonasSnapshotToSupabase = async (personas: CustomerPersona[]) => {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  if (personas.length === 0) return;
  
  // Convert UI customer IDs to customer_number format (strip "CUS-" prefix)
  const candidateCustomerNumbers = personas
    .map((p) => {
      const id = String(p.customerId || '').trim();
      return id.startsWith('CUS-') ? id.slice(4) : id;
    })
    .filter(Boolean);
  
  if (candidateCustomerNumbers.length === 0) return;
  
  // Query customers by customer_number to get their database IDs
  const { data: existingCustomers, error: customerError } = await supabase
    .from('ba_manucustinfo')
    .select('id, customer_number')
    .in('customer_number', candidateCustomerNumbers);
  if (customerError) throw customerError;
  
  // Create a mapping from customer_number to database ID
  const customerNumberToId = new Map<string, number>();
  (existingCustomers || []).forEach((row: any) => {
    customerNumberToId.set(row.customer_number, row.id);
  });
  
  // Build payload with correct database customer IDs
  const payload = personas
    .map((p) => {
      const uiId = String(p.customerId || '').trim();
      const customerNumber = uiId.startsWith('CUS-') ? uiId.slice(4) : uiId;
      const dbCustomerId = customerNumberToId.get(customerNumber);
      
      if (!dbCustomerId) return null;
      
      return {
        ...mapUiPersonaToDb(p),
        customer_id: dbCustomerId
      };
    })
    .filter((p): p is any => p !== null);
  
  if (payload.length === 0) return;
  const { error } = await supabase.from('crm_customer_persona').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
};

export const saveVisitPlansSnapshotToSupabase = async (plans: TodoTask[]) => {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  const payload = plans.map((plan) => ({
    id: plan.id || crypto.randomUUID(),
    title: plan.title || '',
    description: plan.description || '',
    module: 'customer_visit',
    related_id: plan.associatedCustomerId || '',
    source_type: plan.sourceType || null,
    source_id: plan.sourceId || plan.associatedCustomerId || null,
    task_type: plan.taskType || '客户拜访',
    auxiliary_json: plan.auxiliaryData || (plan.objectives ? { objectives: plan.objectives } : null),
    status: plan.status || '待办',
    importance: plan.importance || '中',
    urgency: plan.urgency || '正常',
    assignee_id: '',
    assignee_name: plan.assignee || '',
    due_date: plan.dueDate || null,
    create_date: plan.createDate || new Date().toISOString().split('T')[0],
    creator_id: plan.creatorId || 'system',
    creator_name: plan.creatorName || 'system',
    updated_at: new Date().toISOString()
  }));
  if (payload.length === 0) return;
  const { error } = await supabase.from('crm_task').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
};

export const addCustomerContactQuickToSupabase = async (
  customerId: string,
  contact: { name: string; phone?: string; position?: string; email?: string; wechatId?: string }
) => {
  if (!isSupabaseConfigured()) {
    return {
      id: crypto.randomUUID(),
      customer_id: customerId,
      name: contact.name || '',
      phone: contact.phone || '',
      position: contact.position || '',
      email: contact.email || '',
      wechat_id: contact.wechatId || '',
      is_primary: false
    };
  }

  const dbCustomerId = await resolveCustomerDbIdFromSupabase(customerId);
  if (!dbCustomerId) {
    throw new Error(`无法识别客户ID：${customerId}`);
  }

  const supabase = getSupabaseClient();
  const payload = {
    id: crypto.randomUUID(),
    customer_id: dbCustomerId,
    name: String(contact.name || '').trim(),
    phone: String(contact.phone || '').trim(),
    position: String(contact.position || '').trim(),
    email: String(contact.email || '').trim(),
    wechat_id: String(contact.wechatId || '').trim(),
    is_primary: false,
    updated_at: new Date().toISOString()
  };
  if (!payload.customer_id || !payload.name) {
    throw new Error('customerId 和联系人姓名不能为空');
  }
  const { data, error } = await supabase.from('crm_customer_contact').insert(payload).select('*').single();
  if (error) throw error;
  return data;
};

export const updateCustomerLastVisitDateInSupabase = async (customerId: string, lastVisitDate: string) => {
  if (!isSupabaseConfigured()) return;
  const id = String(customerId || '').trim();
  const date = String(lastVisitDate || '').trim();
  if (!id || !date) return;
  const supabase = getSupabaseClient();
  
  const customerNumber = toCustomerNumber(id);
  
  const { error } = await supabase
    .from('ba_manucustinfo')
    .update({ last_visit_date: date, updated_at: new Date().toISOString() })
    .eq(customerNumber ? 'customer_number' : 'id', customerNumber || id);
  if (error) throw error;
};

export const resolveCustomerDbIdFromSupabase = async (customerId: string): Promise<number | null> => {
  const id = String(customerId || '').trim();
  if (!id) return null;
  if (!isSupabaseConfigured()) return null;
  if (!Number.isNaN(Number(id))) return Number(id);

  const customerNumber = toCustomerNumber(id);
  if (!customerNumber) return null;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('ba_manucustinfo')
    .select('id')
    .eq('customer_number', customerNumber)
    .maybeSingle();
  if (error) throw error;
  return typeof data?.id === 'number' ? data.id : null;
};

export const updateCustomerLastContactInSupabase = async (
  customerId: string,
  action: string,
  contactTime: string = new Date().toISOString()
) => {
  if (!isSupabaseConfigured()) return;
  const id = String(customerId || '').trim();
  if (!id) return;
  const supabase = getSupabaseClient();
  
  const customerNumber = toCustomerNumber(id);
  
  const { error } = await supabase
    .from('ba_manucustinfo')
    .update({
      last_contact_time: contactTime,
      last_contact_action: String(action || '').trim() || '系统更新',
      updated_at: new Date().toISOString()
    })
    .eq(customerNumber ? 'customer_number' : 'id', customerNumber || id);
  if (error) throw error;
};

export const deleteCustomerFromSupabase = async (customerId: string) => {
  if (!isSupabaseConfigured()) return;
  const id = String(customerId || '').trim();
  if (!id) return;
  const supabase = getSupabaseClient();
  
  const customerNumber = toCustomerNumber(id);
  const isDbId = !isNaN(Number(id));
  
  // Get the database ID if we have a customer_number
  let dbId: number | null = null;
  if (!isDbId && customerNumber) {
    const { data, error } = await supabase
      .from('ba_manucustinfo')
      .select('id')
      .eq('customer_number', customerNumber)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    dbId = data?.id || null;
  }
  
  if (!dbId && !isDbId) return;
  
  // 首先删除相关的联系人
  await supabase.from('crm_customer_contact').delete().eq('customer_id', isDbId ? Number(id) : dbId);
  
  // 然后删除客户
  const { error } = await supabase
    .from('ba_manucustinfo')
    .delete()
    .eq(isDbId ? 'id' : 'customer_number', isDbId ? Number(id) : customerNumber);
  if (error) throw error;
};
