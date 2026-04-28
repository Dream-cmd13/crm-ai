import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

export type CustomerFaqSubCategory = {
  id: string;
  name: string;
  question: string;
  answer: string;
};

export type CustomerFaqCategory = {
  id: string;
  name: string;
  subCategories: CustomerFaqSubCategory[];
};

export type CustomerFaqLibraryConfig = {
  categories: CustomerFaqCategory[];
};

const CONFIG_ROW_ID = 'default';

export const defaultCustomerFaqLibraryConfig: CustomerFaqLibraryConfig = {
  categories: [
    {
      id: 'faq_cat_01',
      name: '战略与业务价值',
      subCategories: [
        {
          id: 'faq_sub_01_01',
          name: '是否匹配客户战略',
          question: '我们的方案是否匹配今年战略目标？',
          answer: '先对齐贵司今年增长与交付目标，再说明方案如何缩短导入周期并降低失效风险，建议先做低风险试点验证。'
        },
        {
          id: 'faq_sub_01_02',
          name: 'ROI不清晰',
          question: '这个项目的ROI怎么证明？',
          answer: '先建立现有成本TCO基线，再拆解节省项和风险下降项，形成可审计ROI测算并与财务采购共同复核。'
        }
      ]
    },
    {
      id: 'faq_cat_02',
      name: '需求澄清与场景定义',
      subCategories: [
        {
          id: 'faq_sub_02_01',
          name: '需求描述模糊',
          question: '我们要更稳定，但还没法给明确指标怎么办？',
          answer: '先确认现状故障率和交付波动，再量化影响到停机和返工成本，最后共同冻结验收指标。'
        },
        {
          id: 'faq_sub_02_02',
          name: '需求频繁变更',
          question: '需求一直变，项目周期怎么控？',
          answer: '建议按Must/Should/Could分层，先锁定核心范围，再在里程碑节点处理增量需求。'
        }
      ]
    },
    {
      id: 'faq_cat_03',
      name: '产品与技术方案',
      subCategories: [
        {
          id: 'faq_sub_03_01',
          name: '性能指标是否达标',
          question: '你们性能指标是否能达标？',
          answer: '按双方确认指标做联合验证，提供测试数据并明确边界条件和风险兜底方案。'
        },
        {
          id: 'faq_sub_03_02',
          name: '兼容与集成风险',
          question: '替换后兼容风险怎么控制？',
          answer: '先做接口差异清单，再给适配步骤和回退机制，确保导入风险可控。'
        }
      ]
    },
    {
      id: 'faq_cat_04',
      name: '价格与商务条款',
      subCategories: [
        {
          id: 'faq_sub_04_01',
          name: '价格高于预期',
          question: '你们价格比预期高，怎么谈？',
          answer: '不只比较单价，更看总拥有成本和交付风险，建议按基础版/增强版分层对齐预算。'
        },
        {
          id: 'faq_sub_04_02',
          name: '付款与账期争议',
          question: '账期和付款条款怎么平衡？',
          answer: '可讨论分阶段付款与量产折扣联动，但需要保障现金流安全和交付资源。'
        }
      ]
    }
  ]
};

const normalizeConfig = (raw: any): CustomerFaqLibraryConfig => {
  if (!raw || !Array.isArray(raw.categories) || raw.categories.length === 0) {
    return defaultCustomerFaqLibraryConfig;
  }
  return {
    categories: (raw.categories || []).map((category: any, cIdx: number) => ({
      id: String(category?.id || `faq_cat_${cIdx + 1}`),
      name: String(category?.name || `分类${cIdx + 1}`),
      subCategories: (category?.subCategories || []).map((sub: any, sIdx: number) => ({
        id: String(sub?.id || `faq_sub_${cIdx + 1}_${sIdx + 1}`),
        name: String(sub?.name || `问题${sIdx + 1}`),
        question: String(sub?.question || ''),
        answer: String(sub?.answer || '')
      }))
    }))
  };
};

export const fetchCustomerFaqLibraryConfig = async (): Promise<CustomerFaqLibraryConfig> => {
  if (!isSupabaseConfigured()) return defaultCustomerFaqLibraryConfig;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('crm_customer_faq_library_config')
    .select('config')
    .eq('id', CONFIG_ROW_ID)
    .maybeSingle();
  if (error) throw error;
  return normalizeConfig(data?.config);
};

export const saveCustomerFaqLibraryConfig = async (config: CustomerFaqLibraryConfig): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('crm_customer_faq_library_config')
    .upsert({
      id: CONFIG_ROW_ID,
      config,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
  if (error) throw error;
};
