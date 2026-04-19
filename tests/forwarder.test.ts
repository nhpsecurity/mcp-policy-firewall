import { describe, expect, it, vi } from 'vitest';
import { McpForwarder } from '../src/gateway/forwarder';

type FakeClient = {
  listTools: ReturnType<typeof vi.fn>;
  callTool: ReturnType<typeof vi.fn>;
  listResources: ReturnType<typeof vi.fn>;
  readResource: ReturnType<typeof vi.fn>;
  listPrompts: ReturnType<typeof vi.fn>;
  getPrompt: ReturnType<typeof vi.fn>;
};

function createFakeClient(overrides: Partial<FakeClient> = {}): FakeClient {
  return {
    listTools: vi.fn().mockResolvedValue({ tools: [] }),
    callTool: vi.fn().mockResolvedValue({ content: [] }),
    listResources: vi.fn().mockResolvedValue({ resources: [] }),
    readResource: vi.fn().mockResolvedValue({ contents: [] }),
    listPrompts: vi.fn().mockResolvedValue({ prompts: [] }),
    getPrompt: vi.fn().mockResolvedValue({ messages: [] }),
    ...overrides,
  };
}

function createManager(entries: Array<[string, FakeClient]>) {
  const map = new Map(entries);
  return {
    getEntries: () => [...entries],
    getClient: (name: string) => map.get(name),
  } as any;
}

describe('McpForwarder', () => {
  it('namespaces merged tools across multiple servers', async () => {
    const manager = createManager([
      [
        'alpha',
        createFakeClient({
          listTools: vi.fn().mockResolvedValue({ tools: [{ name: 'read_file' }] }),
        }),
      ],
      [
        'beta',
        createFakeClient({
          listTools: vi.fn().mockResolvedValue({ tools: [{ name: 'search_files' }] }),
        }),
      ],
    ]);

    const forwarder = new McpForwarder(manager);
    const result = await forwarder.listTools();

    expect(result.tools).toHaveLength(2);
    expect((result.tools[0] as any).name).toBe('alpha__read_file');
    expect((result.tools[1] as any).name).toBe('beta__search_files');
  });

  it('delegates unprefixed tool calls when exactly one server is connected', async () => {
    const client = createFakeClient();
    const manager = createManager([['alpha', client]]);
    const forwarder = new McpForwarder(manager);

    await forwarder.callTool({ name: 'read_file', arguments: { path: 'README.md' } });

    expect(client.callTool).toHaveBeenCalledWith({
      name: 'read_file',
      arguments: { path: 'README.md' },
    });
  });

  it('rejects ambiguous unprefixed tool calls when multiple servers are connected', async () => {
    const manager = createManager([
      ['alpha', createFakeClient()],
      ['beta', createFakeClient()],
    ]);
    const forwarder = new McpForwarder(manager);

    await expect(forwarder.callTool({ name: 'read_file' })).rejects.toThrow(/Ambiguous item name/);
  });

  it('rejects malformed namespaced names', async () => {
    const manager = createManager([['alpha', createFakeClient()]]);
    const forwarder = new McpForwarder(manager);

    await expect(forwarder.callTool({ name: 'alpha__' })).rejects.toThrow(
      /Invalid namespaced item name/,
    );
  });

  it('ignores capability-related list errors and continues with healthy servers', async () => {
    const manager = createManager([
      [
        'unsupported',
        createFakeClient({
          listPrompts: vi.fn().mockRejectedValue(new Error('Method not found: prompts/list')),
        }),
      ],
      [
        'healthy',
        createFakeClient({
          listPrompts: vi.fn().mockResolvedValue({ prompts: [{ name: 'security-check' }] }),
        }),
      ],
    ]);

    const forwarder = new McpForwarder(manager);
    const result = await forwarder.listPrompts();

    expect(result.prompts).toHaveLength(1);
    expect((result.prompts[0] as any).name).toBe('healthy__security-check');
  });
});
