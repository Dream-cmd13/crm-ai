export const parseAiJson = (raw: unknown) => {
  if (raw === null || raw === undefined) return {};
  if (typeof raw !== 'string') return raw;
  const text = raw.trim();
  if (!text) return {};

  const normalizeJsonPunctuation = (input: string) =>
    String(input || '')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/：/g, ':');

  const normalizedText = normalizeJsonPunctuation(text);
  const fenceMatch = normalizedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = (fenceMatch?.[1] || normalizedText).trim();

  const tryParseDeep = (input: string, depth = 0): any => {
    const parsed = JSON.parse(input);
    if (typeof parsed === 'string' && depth < 2) {
      const nested = String(parsed || '').trim();
      if ((nested.startsWith('{') && nested.endsWith('}')) || (nested.startsWith('[') && nested.endsWith(']'))) {
        return tryParseDeep(nested, depth + 1);
      }
    }
    return parsed;
  };

  try {
    return tryParseDeep(candidate);
  } catch {
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return tryParseDeep(candidate.slice(firstBrace, lastBrace + 1));
    }
    throw new SyntaxError('AI返回内容不是有效JSON');
  }
};

const normalizeJsonLikeText = (value: any) => {
  if (value && typeof value === 'object') {
    const obj = value as Record<string, any>;
    const keys = Object.keys(obj);
    if (keys.length > 0) {
      return keys
        .map((k) => `【${k}】${String(obj[k] ?? '').replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').trim()}`)
        .join('\n')
        .trim();
    }
  }
  return String(value ?? '')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .trim();
};

export const parsePersonaDimensions = (raw: unknown, fieldIds: string[]): Record<string, string> => {
  const ids = new Set((fieldIds || []).map((x) => String(x || '').trim()).filter(Boolean));
  const mapped: Record<string, string> = {};
  const upsert = (id: string, content: any) => {
    const key = String(id || '').trim();
    if (!key || (ids.size > 0 && !ids.has(key))) return;
    const text = normalizeJsonLikeText(content);
    if (!text) return;
    mapped[key] = text;
  };

  try {
    const parsed: any = parseAiJson(raw);
    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.dimensions)) {
        parsed.dimensions.forEach((item: any) => upsert(item?.id, item?.content));
      }
      if (Array.isArray(parsed.items)) {
        parsed.items.forEach((item: any) => upsert(item?.id, item?.content ?? item?.value));
      }
      if (parsed.data && typeof parsed.data === 'object') {
        Object.entries(parsed.data).forEach(([id, content]) => upsert(id, content));
      }
      Object.entries(parsed).forEach(([id, content]) => upsert(id, content));
    }
  } catch {
    // ignore and fallback regex below
  }

  if (Object.keys(mapped).length > 0) return mapped;

  const text = String(raw ?? '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/：/g, ':');
  const idThenContent = /"id"\s*:\s*"([^"]+)"[\s\S]*?"content"\s*:\s*"([\s\S]*?)"\s*(?:\}|,)/g;
  let match: RegExpExecArray | null = null;
  while ((match = idThenContent.exec(text)) !== null) {
    upsert(match[1], match[2]);
  }

  if (Object.keys(mapped).length > 0) return mapped;

  // 兜底：半结构化文本（如 F1: ... F2: ...）也尽量提取
  const freeFormKeyValue =
    /["']?([Ff]\d+)["']?\s*[:]\s*([\s\S]*?)(?=(?:\n\s*["']?[Ff]\d+["']?\s*[:])|$)/g;
  while ((match = freeFormKeyValue.exec(text)) !== null) {
    upsert(String(match[1] || '').toUpperCase(), match[2]);
  }

  return mapped;
};
