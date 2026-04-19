import { describe, expect, it } from 'vitest';
import { parseConfig } from '../src/config';

describe('config parsing', () => {
  it('applies defaults for minimal config', () => {
    const config = parseConfig({
      servers: [
        {
          name: 'demo',
          type: 'sse',
          url: 'http://localhost:3001/sse',
        },
      ],
    });

    expect(config.host).toBe('127.0.0.1');
    expect(config.port).toBe(8787);
    expect(config.policy.tools.deny).toEqual([]);
    expect(config.servers).toHaveLength(1);
  });

  it('rejects duplicate server names', () => {
    expect(() =>
      parseConfig({
        servers: [
          {
            name: 'dup',
            type: 'sse',
            url: 'http://localhost:3001/sse',
          },
          {
            name: 'dup',
            type: 'sse',
            url: 'http://localhost:4001/sse',
          },
        ],
      }),
    ).toThrow(/Duplicate server name/);
  });

  it('interpolates environment variables in server fields', () => {
    process.env.MCP_FIREWALL_TEST = 'token-value';

    const config = parseConfig({
      servers: [
        {
          name: 'stdio',
          type: 'stdio',
          command: 'node',
          args: ['--token=${MCP_FIREWALL_TEST}'],
          env: {
            API_TOKEN: '${MCP_FIREWALL_TEST}',
          },
        },
      ],
    });

    expect(config.servers[0].type).toBe('stdio');
    if (config.servers[0].type === 'stdio') {
      expect(config.servers[0].args[0]).toContain('token-value');
      expect(config.servers[0].env?.API_TOKEN).toBe('token-value');
    }
  });

  it('rejects unknown top-level config keys to prevent silent misconfiguration', () => {
    expect(() =>
      parseConfig({
        servers: [
          {
            name: 'demo',
            type: 'sse',
            url: 'http://localhost:3001/sse',
          },
        ],
        typoField: true,
      }),
    ).toThrow();
  });

  it('rejects unknown nested policy keys to prevent silent policy typos', () => {
    expect(() =>
      parseConfig({
        servers: [
          {
            name: 'demo',
            type: 'sse',
            url: 'http://localhost:3001/sse',
          },
        ],
        policy: {
          mode: 'hybrid',
          tools: {
            allow: ['*read*'],
            deny: ['*delete*'],
            requireConfirmation: [],
            typoRule: ['*write*'],
          },
        },
      }),
    ).toThrow();
  });
});
