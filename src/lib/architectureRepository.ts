import { OntologyObject, Property, SystemFunction } from '../types/ontology';
import { initialObjects, initialSystemFunctions } from '../data/ontologyData';
import { ontologyDbFieldPresets } from '../data/ontologyDbFieldPresets';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const META_PREFIX = '__json__:';
const FLOW_META_PREFIX = '__flow_json__:';

const toSnake = (value: string) =>
  String(value || '')
    .replace(/^crm_/i, '')
    .replace(/^ba_/i, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();

const canonicalizeOntologyCode = (code: string) => {
  const raw = String(code || '').trim();
  if (!raw) return raw;
  if (raw === 'Employee') return 'users';
  if (raw === 'Product') return 'ba_cpinfo';
  if (raw === 'ProductCategory') return 'ba_cptype';
  if (raw === 'Customer') return 'ba_manucustinfo';
  if (/^ba_/i.test(raw)) return `ba_${toSnake(raw)}`;
  return `crm_${toSnake(raw)}`;
};

const toFlowId = (objectCode: string, flowId: string) => {
  const obj = canonicalizeOntologyCode(objectCode);
  const raw = String(flowId || '').trim();
  if (!raw) return `${obj}__flow_${Date.now()}`;
  if (raw.startsWith(`${obj}__`)) return raw;
  return `${obj}__${raw}`;
};

const toNodeId = (flowId: string, nodeId: string, idx: number) => {
  const raw = String(nodeId || '').trim() || `node_${idx + 1}`;
  if (raw.startsWith(`${flowId}__`)) return raw;
  return `${flowId}__${raw}`;
};

const toFlowDescriptionPayload = (description: string, sopTaskConfig: any, sopOqarConfig?: any, sopPromptConfig?: any, progressionCheck?: any) => {
  if (!sopTaskConfig && !sopOqarConfig && !sopPromptConfig && !progressionCheck) return description || '';
  return `${FLOW_META_PREFIX}${JSON.stringify({
    description: description || '',
    sopTaskConfig,
    sopOqarConfig,
    sopPromptConfig,
    progressionCheck
  })}`;
};

const parseFlowDescriptionPayload = (value: string | null | undefined) => {
  const raw = String(value || '');
  if (!raw.startsWith(FLOW_META_PREFIX)) return { description: raw, sopTaskConfig: undefined, sopOqarConfig: undefined, sopPromptConfig: undefined, progressionCheck: undefined };
  try {
    const parsed = JSON.parse(raw.slice(FLOW_META_PREFIX.length));
    return {
      description: String(parsed?.description || ''),
      sopTaskConfig: parsed?.sopTaskConfig,
      sopOqarConfig: parsed?.sopOqarConfig,
      sopPromptConfig: parsed?.sopPromptConfig,
      progressionCheck: parsed?.progressionCheck
    };
  } catch {
    return { description: raw, sopTaskConfig: undefined, sopOqarConfig: undefined, sopPromptConfig: undefined, progressionCheck: undefined };
  }
};

const applyDbFieldPresets = (objects: OntologyObject[]) => {
  return (objects || []).map((obj) => {
    const presetFields = ontologyDbFieldPresets[obj.code] || [];
    if (!presetFields.length) return obj;
    const existing = new Map((obj.properties || []).map((p) => [p.code, p]));
    presetFields.forEach((f, idx) => {
      if (!existing.has(f.code)) {
        existing.set(f.code, {
          id: `p_${obj.id}_${f.code}_${idx}`,
          name: f.name,
          code: f.code,
          type: f.type,
          required: Boolean(f.required)
        } as Property);
      }
    });
    const rawSubtables = ((obj as any).subtables || []) as any[];
    const subtables = rawSubtables.map((sub) => {
      const subPreset = ontologyDbFieldPresets[sub.code] || [];
      if (!subPreset.length) return sub;
      const subProps = new Map((sub.properties || []).map((p) => [p.code, p]));
      subPreset.forEach((f, idx) => {
        if (!subProps.has(f.code)) {
          subProps.set(f.code, {
            id: `p_${sub.id}_${f.code}_${idx}`,
            name: f.name,
            code: f.code,
            type: f.type,
            required: Boolean(f.required)
          } as Property);
        }
      });
      return { ...sub, properties: Array.from(subProps.values()) };
    });
    return {
      ...obj,
      properties: Array.from(existing.values()),
      ...(rawSubtables.length > 0 ? { subtables } : {})
    };
  });
};

const buildPublishedFlowRowsFromPreset = (objectCode: string) => {
  const canonical = canonicalizeOntologyCode(objectCode);
  const presetObject = initialObjects.find((obj) => canonicalizeOntologyCode(obj.code) === canonical);
  if (!presetObject || !(presetObject.flows || []).length) {
    return { flowRows: [] as any[], nodeRows: [] as any[] };
  }
  const flowRows = (presetObject.flows || []).map((flow) => {
    const flowId = toFlowId(canonical, flow.id);
    return {
      id: flowId,
      object_code: canonical,
      name: flow.name,
      description: toFlowDescriptionPayload(
        flow.description || '',
        (flow as any).sopTaskConfig,
        (flow as any).sopOqarConfig,
        (flow as any).sopPromptConfig,
        (flow as any).progressionCheck
      ),
      trigger_type: flow.triggerType,
      trigger_condition: flow.triggerCondition || '',
      trigger_frequency: flow.triggerFrequency || ''
    };
  });
  const nodeRows = (presetObject.flows || []).flatMap((flow) => {
    const flowId = toFlowId(canonical, flow.id);
    return (flow.nodes || []).map((node, idx) => ({
      id: toNodeId(flowId, node.id, idx),
      flow_id: flowId,
      name: node.name || '',
      description: node.description || '',
      type: node.type || 'manual',
      config_json: {
        condition: node.condition,
        taskType: node.taskType,
        automaticConfig: node.automaticConfig,
        manualConfig: node.manualConfig,
        pushDownConfig: node.pushDownConfig,
        conditionConfig: node.conditionConfig,
        assignedRole: node.assignedRole
      }
    }));
  });
  return { flowRows, nodeRows };
};

const ensurePresetPublishedFlowsForObject = async (objectCode: string) => {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  const canonical = canonicalizeOntologyCode(objectCode);
  const { data: objectRow, error: objectFetchError } = await supabase
    .from('crm_ontology_object')
    .select('id')
    .eq('code', canonical)
    .limit(1);
  if (objectFetchError) throw objectFetchError;
  if ((objectRow || []).length === 0) {
    const presetObject = initialObjects.find((obj) => canonicalizeOntologyCode(obj.code) === canonical);
    const { error: insertObjectError } = await supabase.from('crm_ontology_object').upsert(
      {
        id: canonical,
        code: canonical,
        name: presetObject?.name || canonical,
        description: toDescriptionPayload({
          id: canonical,
          code: canonical,
          name: presetObject?.name || canonical,
          description: presetObject?.description || '',
          rules: presetObject?.rules || [],
          statusAnalysis: presetObject?.statusAnalysis,
          properties: [],
          relations: [],
          flows: []
        } as OntologyObject),
        system_link: `${canonical}表`,
        is_sub_table: false,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'code' }
    );
    if (insertObjectError) throw insertObjectError;
  }
  const { data: existed, error: flowError } = await supabase
    .from('crm_ontology_flow')
    .select('id')
    .eq('object_code', canonical)
    .limit(1);
  if (flowError) throw flowError;
  if ((existed || []).length > 0) return;

  const { flowRows, nodeRows } = buildPublishedFlowRowsFromPreset(canonical);
  if (!flowRows.length) return;
  const { error: insertFlowError } = await supabase.from('crm_ontology_flow').upsert(flowRows, { onConflict: 'id' });
  if (insertFlowError) throw insertFlowError;
  if (nodeRows.length > 0) {
    const { error: insertNodeError } = await supabase.from('crm_ontology_node').upsert(nodeRows, { onConflict: 'id' });
    if (insertNodeError) throw insertNodeError;
  }
};

export const ensurePresetPublishedFlowsSeeded = async (objectCodes?: string[]) => {
  if (!isSupabaseConfigured()) return;
  const targets =
    objectCodes && objectCodes.length > 0
      ? objectCodes
      : initialObjects.filter((o) => (o.flows || []).length > 0).map((o) => o.code);
  for (const code of targets) {
    await ensurePresetPublishedFlowsForObject(code);
  }
};

const toDescriptionPayload = (object: OntologyObject) =>
  `${META_PREFIX}${JSON.stringify({
    description: object.description || '',
    rules: object.rules || [],
    statusAnalysis: object.statusAnalysis || null
  })}`;

const parseDescriptionPayload = (description: string | null | undefined) => {
  const value = description || '';
  if (!value.startsWith(META_PREFIX)) {
    return { description: value, rules: [], statusAnalysis: undefined };
  }
  try {
    const parsed = JSON.parse(value.slice(META_PREFIX.length));
    return {
      description: parsed.description || '',
      rules: parsed.rules || [],
      statusAnalysis: parsed.statusAnalysis || undefined
    };
  } catch {
    return { description: value, rules: [], statusAnalysis: undefined };
  }
};

const normalizePropertyType = (value: any): Property['type'] => {
  const raw = String(value || 'String');
  const lower = raw.toLowerCase();
  if (lower === 'string') return 'String';
  if (lower === 'text') return 'Text';
  if (lower === 'enum' || lower === 'select') return 'Enum';
  if (lower === 'number') return 'Number';
  if (lower === 'boolean' || lower === 'bool') return 'Boolean';
  if (lower === 'date') return 'Date';
  if (lower === 'datetime' || lower === 'datetime-local') return 'DateTime';
  if (lower === 'image') return 'Image';
  if (lower === 'attachment') return 'Attachment';
  if (lower === 'list') return 'List';
  if (raw === 'String' || raw === 'Text' || raw === 'Enum' || raw === 'Number' || raw === 'Boolean' || raw === 'Date' || raw === 'DateTime' || raw === 'Image' || raw === 'Attachment' || raw === 'List') {
    return raw as Property['type'];
  }
  return 'String';
};

const normalizeProperties = (props: any[]): Property[] =>
  (props || []).map((p) => ({
    ...p,
    type: normalizePropertyType(p?.type),
    required: Boolean(p?.required)
  })) as Property[];

export const fetchArchitectureDataFromSupabase = async (options?: { flowSource?: 'published' | 'draft' }): Promise<{
  objects: OntologyObject[];
  systemFunctions: SystemFunction[];
}> => {
  if (!isSupabaseConfigured()) {
    return { objects: initialObjects, systemFunctions: initialSystemFunctions };
  }
  const supabase = getSupabaseClient();
  const flowSource = options?.flowSource || 'published';
  const flowTable = flowSource === 'draft' ? 'crm_ontology_flow_draft' : 'crm_ontology_flow';
  const nodeTable = flowSource === 'draft' ? 'crm_ontology_node_draft' : 'crm_ontology_node';

  const [{ data: objectRows, error: objectError }, { data: propertyRows, error: propertyError }, { data: relationRows, error: relationError }, { data: flowRows, error: flowError }, { data: nodeRows, error: nodeError }] = await Promise.all([
    supabase.from('crm_ontology_object').select('*'),
    supabase.from('crm_ontology_property').select('*'),
    supabase.from('crm_ontology_relation').select('*'),
    supabase.from(flowTable).select('*'),
    supabase.from(nodeTable).select('*')
  ]);
  if (objectError) throw objectError;
  if (propertyError) throw propertyError;
  if (relationError) throw relationError;
  if (flowError) throw flowError;
  if (nodeError) throw nodeError;

  const systemFunctionRow = (objectRows || []).find((row) => row.code === '__system_functions__');
  let systemFunctions: SystemFunction[] = initialSystemFunctions;
  if (systemFunctionRow?.description) {
    try {
      systemFunctions = JSON.parse(systemFunctionRow.description);
    } catch {
      systemFunctions = initialSystemFunctions;
    }
  }

  const businessObjects = (objectRows || []).filter((row) => !String(row.code).startsWith('__'));
  const objectsRaw: OntologyObject[] = businessObjects.map((row) => {
    const canonicalCode = canonicalizeOntologyCode(row.code || '');
    const parsed = parseDescriptionPayload(row.description);
    const flows = (flowRows || [])
      .filter((flow) => canonicalizeOntologyCode(flow.object_code || '') === canonicalCode)
      .map((flow) => {
        const parsedFlow = parseFlowDescriptionPayload(flow.description || '');
        return {
        id: flow.id,
        name: flow.name || '',
        description: parsedFlow.description || '',
        triggerType: flow.trigger_type || 'button',
        triggerCondition: flow.trigger_condition || '',
        triggerFrequency: flow.trigger_frequency || '',
        sopTaskConfig: parsedFlow.sopTaskConfig,
        sopOqarConfig: parsedFlow.sopOqarConfig,
        sopPromptConfig: parsedFlow.sopPromptConfig,
        progressionCheck: parsedFlow.progressionCheck,
        nodes: (nodeRows || [])
          .filter((node) => node.flow_id === flow.id)
          .map((node) => {
            const config = node.config_json || {};
            return {
              id: node.id,
              name: node.name || '',
              description: node.description || '',
              type: node.type || 'manual',
              ...config
            };
          })
      };}
      );
    return {
      id: row.id,
      name: row.name || '',
      code: canonicalCode,
      description: parsed.description || '',
      systemLink: row.system_link || `${canonicalCode}表`,
      isSubTable: Boolean(row.is_sub_table),
      properties: (propertyRows || [])
        .filter((item) => canonicalizeOntologyCode(item.object_code || '') === canonicalCode)
        .map((item) => ({
          id: item.id,
          name: item.name || '',
          code: item.code || '',
          type: normalizePropertyType(item.type),
          required: Boolean(item.required),
          options: item.options_json || []
        })),
      relations: (relationRows || [])
        .filter((item) => canonicalizeOntologyCode(item.object_code || '') === canonicalCode)
        .map((item) => ({
          id: item.id,
          targetObject: canonicalizeOntologyCode(item.target_object_code || ''),
          relationType: item.relation_type || '1:N',
          description: item.description || ''
        })),
      flows,
      rules: parsed.rules || [],
      statusAnalysis: parsed.statusAnalysis
    };
  });
  const objectMap = new Map<string, OntologyObject>();
  objectsRaw.forEach((obj) => {
    const existed = objectMap.get(obj.code);
    if (!existed) {
      objectMap.set(obj.code, obj);
      return;
    }
    const propByCode = new Map<string, any>();
    [...existed.properties, ...obj.properties].forEach((p) => propByCode.set(p.code, p));
    const relByKey = new Map<string, any>();
    [...existed.relations, ...obj.relations].forEach((r) => relByKey.set(`${r.targetObject}:${r.relationType}`, r));
    const flowById = new Map<string, any>();
    [...existed.flows, ...obj.flows].forEach((f) => flowById.set(f.id, f));
    objectMap.set(obj.code, {
      ...existed,
      properties: Array.from(propByCode.values()),
      relations: Array.from(relByKey.values()),
      flows: Array.from(flowById.values()),
      rules: existed.rules?.length ? existed.rules : obj.rules,
      statusAnalysis: existed.statusAnalysis || obj.statusAnalysis
    });
  });
  const objects: OntologyObject[] = Array.from(objectMap.values());

  let finalObjects = objects.length > 0 ? objects : initialObjects;
  
  // Merge missing objects from initialObjects into finalObjects
  if (objects.length > 0) {
    const mapOntologyCode = (code: string) => {
      if (code === 'Employee') return 'users';
      if (code === 'Product') return 'ba_cpinfo';
      if (code === 'ProductCategory') return 'ba_cptype';
      if (code === 'Customer') return 'ba_manucustinfo';
      return canonicalizeOntologyCode(code);
    };
    
    const existingCodes = new Set(objects.map(o => o.code));
    const missingObjects = initialObjects.filter(o => !existingCodes.has(mapOntologyCode(o.code)));
    
    if (missingObjects.length > 0) {
      // Normalize missing objects before adding
      const normalizedMissing = missingObjects.map(obj => {
        const mappedCode = mapOntologyCode(obj.code);
        const normalizedProps = normalizeProperties(obj.properties as any);
        const hasIdProperty = normalizedProps.some(p => p.code === 'id');
        const propsWithId = hasIdProperty
          ? normalizedProps
          : [{ id: `p_id_${obj.id}`, name: 'ID', code: 'id', type: 'String', required: true } as Property, ...normalizedProps];
        return {
          ...obj,
          code: mappedCode,
          systemLink: `${mappedCode}表`,
          properties: propsWithId,
          relations: obj.relations.map(r => ({ ...r, targetObject: mapOntologyCode(r.targetObject) }))
        };
      });
      finalObjects = [...objects, ...normalizedMissing];
    }
  }

  const mapOntologyCode = (code: string) => {
    return canonicalizeOntologyCode(code);
  };
  const defaultStatusAnalysisByCode = new Map<string, OntologyObject['statusAnalysis']>();
  initialObjects.forEach((obj) => {
    const code = mapOntologyCode(obj.code);
    defaultStatusAnalysisByCode.set(code, obj.statusAnalysis);
  });
  finalObjects = finalObjects.map((obj) => {
    const patched: OntologyObject = { ...obj };
    if (!patched.statusAnalysis) {
      const defaultStatusAnalysis = defaultStatusAnalysisByCode.get(patched.code);
      if (defaultStatusAnalysis) patched.statusAnalysis = defaultStatusAnalysis;
    }
    return patched;
  });
  finalObjects = applyDbFieldPresets(finalObjects);

  return {
    objects: finalObjects,
    systemFunctions
  };
};

export const saveArchitectureDataToSupabase = async (
  objects: OntologyObject[],
  systemFunctions: SystemFunction[],
  options?: { saveFlows?: boolean; flowTarget?: 'published' | 'draft'; flowObjectCodes?: string[] }
) => {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  const normalizedObjects = Array.from(
    new Map(
      (objects || []).map((obj) => {
        const code = canonicalizeOntologyCode(obj.code);
        return [code, {
          ...obj,
          code,
          systemLink: obj.systemLink || `${code}表`,
          relations: (obj.relations || []).map((r) => ({ ...r, targetObject: canonicalizeOntologyCode(r.targetObject) }))
        } as OntologyObject];
      })
    ).values()
  );
  const { data: existingObjects, error: existingObjectsError } = await supabase.from('crm_ontology_object').select('id,code');
  if (existingObjectsError) throw existingObjectsError;
  const idByCode = new Map<string, string>((existingObjects || []).map((r: any) => [r.code, r.id]));

  const objectRowsRaw = normalizedObjects.map((object) => ({
    id: idByCode.get(object.code) || object.id,
    name: object.name,
    code: object.code,
    description: toDescriptionPayload(object),
    system_link: object.systemLink || '',
    is_sub_table: Boolean(object.isSubTable),
    updated_at: new Date().toISOString()
  }));
  const objectRows = Array.from(new Map(objectRowsRaw.map((row) => [row.id, row])).values());

  const { error: objectUpsertError } = await supabase.from('crm_ontology_object').upsert(objectRows, { onConflict: 'id' });
  if (objectUpsertError) throw objectUpsertError;

  const legacyDuplicateCodes = ['Inquiry', 'Lead', 'Opportunity', 'Project', 'crm_Inquiry', 'crm_Lead', 'crm_Opportunity', 'crm_Project'];
  if (legacyDuplicateCodes.length > 0) {
    await supabase.from('crm_ontology_property').delete().in('object_code', legacyDuplicateCodes);
    await supabase.from('crm_ontology_relation').delete().in('object_code', legacyDuplicateCodes);
    await supabase.from('crm_ontology_flow').delete().in('object_code', legacyDuplicateCodes);
    await supabase.from('crm_ontology_flow_draft').delete().in('object_code', legacyDuplicateCodes);
    await supabase.from('crm_ontology_object').delete().in('code', legacyDuplicateCodes);
  }

  const objectCodes = normalizedObjects.map((object) => object.code);
  if (objectCodes.length > 0) {
    const { error: deletePropertiesError } = await supabase.from('crm_ontology_property').delete().in('object_code', objectCodes);
    if (deletePropertiesError) throw deletePropertiesError;
    const { error: deleteRelationsError } = await supabase.from('crm_ontology_relation').delete().in('object_code', objectCodes);
    if (deleteRelationsError) throw deleteRelationsError;
    const saveFlows = options?.saveFlows !== false;
    const flowTarget = options?.flowTarget || 'published';
    const flowTable = flowTarget === 'draft' ? 'crm_ontology_flow_draft' : 'crm_ontology_flow';
    const nodeTable = flowTarget === 'draft' ? 'crm_ontology_node_draft' : 'crm_ontology_node';
    const flowObjectCodes = (options?.flowObjectCodes || objectCodes).map(canonicalizeOntologyCode);

    if (saveFlows && flowObjectCodes.length > 0) {
      const { data: existingFlows, error: fetchFlowError } = await supabase.from(flowTable).select('id').in('object_code', flowObjectCodes);
      if (fetchFlowError) throw fetchFlowError;
      const flowIds = (existingFlows || []).map((row: any) => row.id);
      if (flowIds.length > 0) {
        const { error: deleteNodesError } = await supabase.from(nodeTable).delete().in('flow_id', flowIds);
        if (deleteNodesError) throw deleteNodesError;
      }
      const { error: deleteFlowsError } = await supabase.from(flowTable).delete().in('object_code', flowObjectCodes);
      if (deleteFlowsError) throw deleteFlowsError;
    }
  }

  const propertyRowsRaw = normalizedObjects.flatMap((object) =>
    (object.properties || []).map((property) => ({
      id: property.id,
      object_code: object.code,
      name: property.name,
      code: property.code,
      type: property.type,
      required: Boolean(property.required),
      options_json: property.options || []
    }))
  );
  const propertyRows = Array.from(new Map(propertyRowsRaw.map((row) => [row.id, row])).values());
  if (propertyRows.length > 0) {
    const { error: insertPropertiesError } = await supabase.from('crm_ontology_property').upsert(propertyRows, { onConflict: 'id' });
    if (insertPropertiesError) throw insertPropertiesError;
  }

  const relationRowsRaw = normalizedObjects.flatMap((object) =>
    (object.relations || []).map((relation) => ({
      id: relation.id,
      object_code: object.code,
      target_object_code: relation.targetObject,
      relation_type: relation.relationType,
      description: relation.description || ''
    }))
  );
  const relationRows = Array.from(new Map(relationRowsRaw.map((row) => [row.id, row])).values());
  if (relationRows.length > 0) {
    const { error: insertRelationsError } = await supabase.from('crm_ontology_relation').upsert(relationRows, { onConflict: 'id' });
    if (insertRelationsError) throw insertRelationsError;
  }

  const saveFlows = options?.saveFlows !== false;
  const flowTarget = options?.flowTarget || 'published';
  const flowTable = flowTarget === 'draft' ? 'crm_ontology_flow_draft' : 'crm_ontology_flow';
  const nodeTable = flowTarget === 'draft' ? 'crm_ontology_node_draft' : 'crm_ontology_node';
  const flowObjectCodes = (options?.flowObjectCodes || objectCodes).map(canonicalizeOntologyCode);
  const objectsForFlow = saveFlows && flowObjectCodes.length > 0 ? normalizedObjects.filter((o) => flowObjectCodes.includes(o.code)) : [];

  const flowRowsRaw = objectsForFlow.flatMap((object) =>
    (object.flows || []).map((flow) => {
      const flowId = toFlowId(object.code, flow.id);
      return {
        id: flowId,
        object_code: object.code,
        name: flow.name,
        description: toFlowDescriptionPayload(
          flow.description || '',
          (flow as any).sopTaskConfig,
          (flow as any).sopOqarConfig,
          (flow as any).sopPromptConfig,
          (flow as any).progressionCheck
        ),
        trigger_type: flow.triggerType,
        trigger_condition: flow.triggerCondition || '',
        trigger_frequency: flow.triggerFrequency || ''
      };
    })
  );
  const flowRows = Array.from(new Map(flowRowsRaw.map((row) => [row.id, row])).values());
  if (flowRows.length > 0) {
    const { error: insertFlowsError } = await supabase.from(flowTable).upsert(flowRows, { onConflict: 'id' });
    if (insertFlowsError) throw insertFlowsError;
  }

  const nodeRowsRaw = objectsForFlow.flatMap((object) =>
    (object.flows || []).flatMap((flow) => {
      const flowId = toFlowId(object.code, flow.id);
      return (flow.nodes || []).map((node, idx) => ({
        id: toNodeId(flowId, node.id, idx),
        flow_id: flowId,
        name: node.name || '',
        description: node.description || '',
        type: node.type || 'manual',
        config_json: {
          condition: node.condition,
          taskType: node.taskType,
          automaticConfig: node.automaticConfig,
          manualConfig: node.manualConfig,
          pushDownConfig: node.pushDownConfig,
          conditionConfig: node.conditionConfig,
          assignedRole: node.assignedRole
        }
      }));
    })
  );
  const nodeRows = Array.from(new Map(nodeRowsRaw.map((row) => [row.id, row])).values());
  if (nodeRows.length > 0) {
    const { error: insertNodesError } = await supabase.from(nodeTable).upsert(nodeRows, { onConflict: 'id' });
    if (insertNodesError) throw insertNodesError;
  }

  const { error: systemFunctionError } = await supabase.from('crm_ontology_object').upsert(
    {
      id: idByCode.get('__system_functions__') || '__system_functions__',
      name: '系统功能存储',
      code: '__system_functions__',
      description: JSON.stringify(systemFunctions || []),
      system_link: 'internal',
      is_sub_table: true,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'code' }
  );
  if (systemFunctionError) throw systemFunctionError;
};

export const fetchFlowsForObjectFromSupabase = async (
  objectCode: string,
  flowSource: 'published' | 'draft'
) => {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseClient();
  const flowTable = flowSource === 'draft' ? 'crm_ontology_flow_draft' : 'crm_ontology_flow';
  const nodeTable = flowSource === 'draft' ? 'crm_ontology_node_draft' : 'crm_ontology_node';
  const canonical = canonicalizeOntologyCode(objectCode);
  const { data: flowRows, error: flowError } = await supabase.from(flowTable).select('*').eq('object_code', canonical);
  if (flowError) throw flowError;
  const flowIds = (flowRows || []).map((f: any) => f.id);
  let nodeRows: any[] = [];
  if (flowIds.length > 0) {
    const { data, error } = await supabase.from(nodeTable).select('*').in('flow_id', flowIds);
    if (error) throw error;
    nodeRows = data || [];
  }

  const flows = (flowRows || []).map((flow: any) => {
    const parsed = parseFlowDescriptionPayload(flow.description || '');
    return {
      id: flow.id,
      name: flow.name || '',
      description: parsed.description || '',
      triggerType: flow.trigger_type || 'button',
      triggerCondition: flow.trigger_condition || '',
      triggerFrequency: flow.trigger_frequency || '',
      sopTaskConfig: parsed.sopTaskConfig,
      sopOqarConfig: parsed.sopOqarConfig,
      sopPromptConfig: parsed.sopPromptConfig,
      progressionCheck: parsed.progressionCheck,
      nodes: (nodeRows || [])
        .filter((n: any) => n.flow_id === flow.id)
        .map((n: any) => {
          const config = n.config_json || {};
          return {
            id: n.id,
            name: n.name || '',
            description: n.description || '',
            type: n.type || 'manual',
            ...config
          };
        })
    };
  });
  return flows;
};

const isRpcMissingError = (error: any, functionName: string) => {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return code === 'PGRST202' && message.includes(functionName);
};

const clearDraftForObject = async (canonical: string) => {
  const supabase = getSupabaseClient();
  const { data: draftFlows, error: draftFlowError } = await supabase
    .from('crm_ontology_flow_draft')
    .select('id')
    .eq('object_code', canonical);
  if (draftFlowError) throw draftFlowError;
  const draftFlowIds = (draftFlows || []).map((f: any) => String(f.id));
  if (draftFlowIds.length > 0) {
    const { error: delDraftNodeError } = await supabase
      .from('crm_ontology_node_draft')
      .delete()
      .in('flow_id', draftFlowIds);
    if (delDraftNodeError) throw delDraftNodeError;
  }
  const { error: delDraftFlowError } = await supabase
    .from('crm_ontology_flow_draft')
    .delete()
    .eq('object_code', canonical);
  if (delDraftFlowError) throw delDraftFlowError;
};

const fallbackPrepareFlowDraftForObject = async (canonical: string) => {
  const supabase = getSupabaseClient();
  await clearDraftForObject(canonical);
  const { data: publishedFlows, error: publishedFlowError } = await supabase
    .from('crm_ontology_flow')
    .select('*')
    .eq('object_code', canonical);
  if (publishedFlowError) throw publishedFlowError;
  const flowRows = (publishedFlows || []).map((f: any) => ({
    id: f.id,
    object_code: f.object_code,
    name: f.name,
    description: f.description,
    trigger_type: f.trigger_type,
    trigger_condition: f.trigger_condition,
    trigger_frequency: f.trigger_frequency
  }));
  if (flowRows.length > 0) {
    const { error: insertDraftFlowError } = await supabase
      .from('crm_ontology_flow_draft')
      .upsert(flowRows, { onConflict: 'id' });
    if (insertDraftFlowError) throw insertDraftFlowError;
  }
  const flowIds = flowRows.map((f) => String(f.id));
  if (flowIds.length === 0) return;
  const { data: publishedNodes, error: publishedNodeError } = await supabase
    .from('crm_ontology_node')
    .select('*')
    .in('flow_id', flowIds);
  if (publishedNodeError) throw publishedNodeError;
  const nodeRows = (publishedNodes || []).map((n: any) => ({
    id: n.id,
    flow_id: n.flow_id,
    name: n.name,
    description: n.description,
    type: n.type,
    config_json: n.config_json || {}
  }));
  if (nodeRows.length > 0) {
    const { error: insertDraftNodeError } = await supabase
      .from('crm_ontology_node_draft')
      .upsert(nodeRows, { onConflict: 'id' });
    if (insertDraftNodeError) throw insertDraftNodeError;
  }
};

const fallbackPublishFlowDraftForObject = async (canonical: string) => {
  const supabase = getSupabaseClient();
  const { data: existingFlows, error: existingFlowError } = await supabase
    .from('crm_ontology_flow')
    .select('*')
    .eq('object_code', canonical);
  if (existingFlowError) throw existingFlowError;
  const existingFlowIds = (existingFlows || []).map((f: any) => String(f.id));
  let existingNodes: any[] = [];
  if (existingFlowIds.length > 0) {
    const { data, error } = await supabase.from('crm_ontology_node').select('*').in('flow_id', existingFlowIds);
    if (error) throw error;
    existingNodes = data || [];
  }
  const snapshot = {
    flows: existingFlows || [],
    nodes: existingNodes || [],
    created_at: new Date().toISOString()
  };
  const { error: historyError } = await supabase.from('crm_ontology_flow_publish_history').insert({
    object_code: canonical,
    snapshot_json: snapshot
  });
  if (historyError) throw historyError;

  const { data: draftFlows, error: draftFlowError } = await supabase
    .from('crm_ontology_flow_draft')
    .select('*')
    .eq('object_code', canonical);
  if (draftFlowError) throw draftFlowError;
  const draftFlowRows = (draftFlows || []).map((f: any) => ({
    id: f.id,
    object_code: f.object_code,
    name: f.name,
    description: f.description,
    trigger_type: f.trigger_type,
    trigger_condition: f.trigger_condition,
    trigger_frequency: f.trigger_frequency
  }));
  if (existingFlowIds.length > 0) {
    const { error: delNodeError } = await supabase.from('crm_ontology_node').delete().in('flow_id', existingFlowIds);
    if (delNodeError) throw delNodeError;
  }
  const { error: delFlowError } = await supabase.from('crm_ontology_flow').delete().eq('object_code', canonical);
  if (delFlowError) throw delFlowError;
  if (draftFlowRows.length > 0) {
    const { error: insertFlowError } = await supabase.from('crm_ontology_flow').upsert(draftFlowRows, { onConflict: 'id' });
    if (insertFlowError) throw insertFlowError;
    const draftFlowIds = draftFlowRows.map((f) => String(f.id));
    const { data: draftNodes, error: draftNodeError } = await supabase
      .from('crm_ontology_node_draft')
      .select('*')
      .in('flow_id', draftFlowIds);
    if (draftNodeError) throw draftNodeError;
    const nodeRows = (draftNodes || []).map((n: any) => ({
      id: n.id,
      flow_id: n.flow_id,
      name: n.name,
      description: n.description,
      type: n.type,
      config_json: n.config_json || {}
    }));
    if (nodeRows.length > 0) {
      const { error: insertNodeError } = await supabase.from('crm_ontology_node').upsert(nodeRows, { onConflict: 'id' });
      if (insertNodeError) throw insertNodeError;
    }
  }
};

const fallbackRollbackFlowPublishedForObject = async (canonical: string) => {
  const supabase = getSupabaseClient();
  const { data: historyRows, error: historyError } = await supabase
    .from('crm_ontology_flow_publish_history')
    .select('*')
    .eq('object_code', canonical)
    .order('created_at', { ascending: false })
    .limit(1);
  if (historyError) throw historyError;
  const latest = historyRows?.[0];
  if (!latest?.snapshot_json) return;
  const snapshot = latest.snapshot_json as any;
  const flows = Array.isArray(snapshot?.flows) ? snapshot.flows : [];
  const nodes = Array.isArray(snapshot?.nodes) ? snapshot.nodes : [];
  const currentFlowIds = (await supabase.from('crm_ontology_flow').select('id').eq('object_code', canonical)).data?.map((f: any) => String(f.id)) || [];
  if (currentFlowIds.length > 0) {
    const { error: delNodeError } = await supabase.from('crm_ontology_node').delete().in('flow_id', currentFlowIds);
    if (delNodeError) throw delNodeError;
  }
  const { error: delFlowError } = await supabase.from('crm_ontology_flow').delete().eq('object_code', canonical);
  if (delFlowError) throw delFlowError;
  if (flows.length > 0) {
    const { error: insertFlowError } = await supabase.from('crm_ontology_flow').upsert(flows, { onConflict: 'id' });
    if (insertFlowError) throw insertFlowError;
  }
  if (nodes.length > 0) {
    const { error: insertNodeError } = await supabase.from('crm_ontology_node').upsert(nodes, { onConflict: 'id' });
    if (insertNodeError) throw insertNodeError;
  }
};

export const prepareFlowDraftForObject = async (objectCode: string) => {
  if (!isSupabaseConfigured()) return;
  const canonical = canonicalizeOntologyCode(objectCode);
  await ensurePresetPublishedFlowsForObject(canonical);
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc('crm_prepare_flow_draft', { p_object_code: canonical });
  if (!error) return;
  if (isRpcMissingError(error, 'crm_prepare_flow_draft')) {
    await fallbackPrepareFlowDraftForObject(canonical);
    return;
  }
  throw error;
};

export const discardFlowDraftForObject = async (objectCode: string) => {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  const canonical = canonicalizeOntologyCode(objectCode);
  const { error } = await supabase.rpc('crm_discard_flow_draft', { p_object_code: canonical });
  if (!error) return;
  if (isRpcMissingError(error, 'crm_discard_flow_draft')) {
    await clearDraftForObject(canonical);
    return;
  }
  throw error;
};

export const publishFlowDraftForObject = async (objectCode: string) => {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  const canonical = canonicalizeOntologyCode(objectCode);
  const { error } = await supabase.rpc('crm_publish_flow_draft', { p_object_code: canonical });
  if (!error) return;
  if (isRpcMissingError(error, 'crm_publish_flow_draft')) {
    await fallbackPublishFlowDraftForObject(canonical);
    return;
  }
  throw error;
};

export const rollbackFlowPublishedForObject = async (objectCode: string) => {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  const canonical = canonicalizeOntologyCode(objectCode);
  const { error } = await supabase.rpc('crm_rollback_flow_published', { p_object_code: canonical });
  if (!error) return;
  if (isRpcMissingError(error, 'crm_rollback_flow_published')) {
    await fallbackRollbackFlowPublishedForObject(canonical);
    return;
  }
  throw error;
};
