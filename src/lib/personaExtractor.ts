import { getSupabaseClient } from './supabaseClient';
import { callAiProxy } from './aiProxy';
import { resolveCustomerDbIdFromSupabase } from './customerRepository';

/**
 * AI Context Thinning & Persona Extraction
 * 模块3: 聊天记录 -> 画像的提炼机制
 * 定期或在单据流转时触发，将长文本聊天记录浓缩为精准的客户画像与联系人性格标签。
 */
export const extractAndThinContext = async (customerId: string) => {
  const dbId = await resolveCustomerDbIdFromSupabase(customerId);
  if (!dbId) return;
  const supabase = getSupabaseClient();
  
  // 1. Fetch unsummarized chat logs
  const { data: logs, error } = await supabase
    .from('crm_communication_log')
    .select('*')
    .eq('customer_id', dbId)
    .is('is_summarized', false) // assuming we add this flag
    .order('created_at', { ascending: true });
    
  if (error || !logs || logs.length === 0) return;

  const chatText = logs.map(l => `[${l.date}] ${l.sender}: ${l.content}`).join('\n');
  
  // 2. Fetch existing persona
  const { data: personaData } = await supabase
    .from('crm_customer_persona')
    .select('*')
    .eq('customer_id', dbId)
    .single();

  const existingPersona = personaData || {};
  
  // 3. AI Extraction Prompt
  const prompt = `
你是一个资深B2B销售总监。请阅读以下未提炼的聊天记录，并结合已有客户画像，提炼并更新客户信息。
[已有画像]: ${JSON.stringify(existingPersona)}
[新增聊天记录]:
${chatText}

请输出更新后的 JSON (包含 painPoints, rdRequirements, buyingMode 等字段)。不要包含多余文本。
  `;

  // 4. Call AI
  const aiResultText = await callAiProxy(prompt);
  
  try {
    const updatedPersona = JSON.parse(aiResultText.replace(/```json|```/g, ''));
    
    // 5. Update Persona
    if (personaData?.id) {
      await supabase
        .from('crm_customer_persona')
        .update(updatedPersona)
        .eq('id', personaData.id);
    } else {
      await supabase
        .from('crm_customer_persona')
        .insert({ ...updatedPersona, customer_id: dbId });
    }

    // 6. Mark logs as summarized
    const logIds = logs.map(l => l.id);
    await supabase
      .from('crm_communication_log')
      .update({ is_summarized: true })
      .in('id', logIds);
      
  } catch (e) {
    console.error('Failed to parse AI persona extraction result', e);
  }
};
