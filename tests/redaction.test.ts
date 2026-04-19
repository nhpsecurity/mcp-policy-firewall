import { describe, expect, it } from 'vitest';
import { redactText, redactUnknown } from '../src/redaction/redact';

describe('redaction', () => {
  it('redacts bearer tokens in text', () => {
    const result = redactText('Authorization: Bearer abcdefghijklmnopqrst');

    expect(result.redactionCount).toBeGreaterThan(0);
    expect(result.value).toContain('[REDACTED:bearer-token]');
  });

  it('redacts nested objects and tracks redaction types', () => {
    const payload = {
      headers: {
        Authorization: 'Bearer verysecrettokenvalue',
      },
      env: 'API_KEY=supersecretkeyvalue',
    };

    const result = redactUnknown(payload);

    expect(result.redactionCount).toBeGreaterThan(0);
    expect(result.redactionTypes.length).toBeGreaterThan(0);
    expect(JSON.stringify(result.value)).toContain('[REDACTED:');
  });
});
