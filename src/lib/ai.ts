import { OntologyObject } from '../types/ontology';
import { callAiProxy } from './aiProxy';

export async function performStatusAnalysis(
  objectConfig: OntologyObject,
  data: any
): Promise<string> {
  if (!objectConfig.statusAnalysis || !objectConfig.statusAnalysis.enabled) {
    throw new Error('Status analysis is not enabled for this object.');
  }

  const { model: modelName, promptTemplate, inputs } = objectConfig.statusAnalysis;
  const finalModel = modelName || '';

  // Replace placeholders in promptTemplate
  let prompt = promptTemplate;
  for (const input of inputs) {
    let value = '';
    if (input.type === 'current_field' && input.currentFieldCode) {
      value = data[input.currentFieldCode] || 'N/A';
    }
    
    const placeholder = `{{${input.name}}}`;
    const altPlaceholder = `{${input.name}}`;
    prompt = prompt.replace(new RegExp(placeholder, 'g'), String(value));
    prompt = prompt.replace(new RegExp(altPlaceholder, 'g'), String(value));
  }

  try {
    return await callAiProxy(prompt, finalModel);
  } catch (error) {
    console.error('AI Analysis Error:', error);
    throw new Error('Failed to perform AI analysis.');
  }
}
