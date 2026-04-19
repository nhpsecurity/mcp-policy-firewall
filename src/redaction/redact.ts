import {
  compileExtraPatterns,
  DEFAULT_REDACTION_PATTERNS,
  type NamedRedactionPattern,
} from './patterns';

export interface RedactionResult<T> {
  value: T;
  redactionCount: number;
  redactionTypes: string[];
}

function redactTextInternal(
  input: string,
  patterns: NamedRedactionPattern[],
): RedactionResult<string> {
  let output = input;
  let redactionCount = 0;
  const redactionTypes = new Set<string>();

  for (const pattern of patterns) {
    output = output.replace(pattern.regex, () => {
      redactionCount += 1;
      redactionTypes.add(pattern.name);
      return `[REDACTED:${pattern.name}]`;
    });
  }

  return {
    value: output,
    redactionCount,
    redactionTypes: [...redactionTypes],
  };
}

function redactUnknownInternal(
  input: unknown,
  patterns: NamedRedactionPattern[],
  seen: WeakSet<object>,
): RedactionResult<unknown> {
  if (typeof input === 'string') {
    return redactTextInternal(input, patterns);
  }

  if (Array.isArray(input)) {
    const sanitizedItems: unknown[] = [];
    let totalCount = 0;
    const typeSet = new Set<string>();

    for (const value of input) {
      const result = redactUnknownInternal(value, patterns, seen);
      sanitizedItems.push(result.value);
      totalCount += result.redactionCount;
      for (const redactionType of result.redactionTypes) {
        typeSet.add(redactionType);
      }
    }

    return {
      value: sanitizedItems,
      redactionCount: totalCount,
      redactionTypes: [...typeSet],
    };
  }

  if (input && typeof input === 'object') {
    if (seen.has(input)) {
      return {
        value: input,
        redactionCount: 0,
        redactionTypes: [],
      };
    }

    seen.add(input);

    const sanitizedObject: Record<string, unknown> = {};
    let totalCount = 0;
    const typeSet = new Set<string>();

    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      const result = redactUnknownInternal(value, patterns, seen);
      sanitizedObject[key] = result.value;
      totalCount += result.redactionCount;
      for (const redactionType of result.redactionTypes) {
        typeSet.add(redactionType);
      }
    }

    return {
      value: sanitizedObject,
      redactionCount: totalCount,
      redactionTypes: [...typeSet],
    };
  }

  return {
    value: input,
    redactionCount: 0,
    redactionTypes: [],
  };
}

export function redactText(input: string, extraPatterns: string[] = []): RedactionResult<string> {
  const patterns = [...DEFAULT_REDACTION_PATTERNS, ...compileExtraPatterns(extraPatterns)];
  return redactTextInternal(input, patterns);
}

export function redactUnknown(
  input: unknown,
  extraPatterns: string[] = [],
): RedactionResult<unknown> {
  const patterns = [...DEFAULT_REDACTION_PATTERNS, ...compileExtraPatterns(extraPatterns)];
  return redactUnknownInternal(input, patterns, new WeakSet<object>());
}
