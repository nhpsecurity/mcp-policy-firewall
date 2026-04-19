export interface NamedRedactionPattern {
  name: string;
  regex: RegExp;
}

export const DEFAULT_REDACTION_PATTERNS: NamedRedactionPattern[] = [
  {
    name: 'bearer-token',
    regex: /\bBearer\s+[A-Za-z0-9._+/=-]{10,}\b/gi,
  },
  {
    name: 'github-token',
    regex: /\b(?:ghp|gho|ghu|github_pat)_[A-Za-z0-9_]{20,}\b/g,
  },
  {
    name: 'api-key-assignment',
    regex: /\b(api[_-]?key|token|secret|password)\s*[:=]\s*['"]?([A-Za-z0-9._-]{8,})['"]?/gi,
  },
  {
    name: 'dotenv-line',
    regex: /^\s*[A-Z0-9_]{2,}\s*=\s*.+$/gim,
  },
];

export function compileExtraPatterns(patterns: string[]): NamedRedactionPattern[] {
  const compiled: NamedRedactionPattern[] = [];

  for (const [index, pattern] of patterns.entries()) {
    try {
      compiled.push({
        name: `custom-${index + 1}`,
        regex: new RegExp(pattern, 'gi'),
      });
    } catch {
      // Ignore invalid custom regex patterns to avoid runtime failures.
    }
  }

  return compiled;
}
