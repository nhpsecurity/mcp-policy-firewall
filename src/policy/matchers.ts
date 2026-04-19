function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function wildcardToRegExp(pattern: string): RegExp {
  const escaped = escapeRegExp(pattern).replace(/\\\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}

export function matchesPattern(value: string, pattern: string): boolean {
  if (!pattern.includes('*')) {
    return value === pattern;
  }

  return wildcardToRegExp(pattern).test(value);
}

export function findMatchingPattern(value: string, patterns: string[]): string | undefined {
  for (const pattern of patterns) {
    if (matchesPattern(value, pattern)) {
      return pattern;
    }
  }

  return undefined;
}
