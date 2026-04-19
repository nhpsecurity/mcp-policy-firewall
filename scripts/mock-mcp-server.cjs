const { McpServer, ResourceTemplate } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');

const server = new McpServer({
  name: 'mock-filesystem-server',
  version: '0.1.0',
});

server.registerTool(
  'read_file',
  {
    title: 'Read File',
    description: 'Read a file from the local workspace (mock).',
    inputSchema: {
      path: z.string(),
    },
  },
  async ({ path }) => {
    return {
      content: [
        {
          type: 'text',
          text: `Mock read success for path: ${path}`,
        },
      ],
    };
  },
);

server.registerTool(
  'search_files',
  {
    title: 'Search Files',
    description: 'Search files in workspace (mock).',
    inputSchema: {
      query: z.string().optional(),
    },
  },
  async ({ query }) => {
    return {
      content: [
        {
          type: 'text',
          text: `Mock search executed for query: ${query ?? '<none>'}`,
        },
      ],
    };
  },
);

server.registerTool(
  'delete_file',
  {
    title: 'Delete File',
    description: 'Delete a file (mock risky tool for firewall deny demo).',
    inputSchema: {
      path: z.string(),
    },
  },
  async ({ path }) => {
    return {
      content: [
        {
          type: 'text',
          text: `Mock delete executed for path: ${path}`,
        },
      ],
    };
  },
);

server.registerResource(
  'mock-readme',
  'file:///README.md',
  {
    title: 'Mock README',
    description: 'Mock resource for resources/list demo.',
    mimeType: 'text/plain',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'file:///README.md',
          mimeType: 'text/plain',
          text: 'Mock README resource from mock MCP server.',
        },
      ],
    };
  },
);

server.registerResource(
  'mock-file-template',
  new ResourceTemplate('mock://files/{name}', { list: undefined }),
  {
    title: 'Mock File Template',
    description: 'Template resource for dynamic mock files.',
    mimeType: 'text/plain',
  },
  async (uri, params) => {
    return {
      contents: [
        {
          uri,
          mimeType: 'text/plain',
          text: `Mock dynamic resource for ${params.name ?? 'unknown'}`,
        },
      ],
    };
  },
);

server.registerPrompt(
  'security-check',
  {
    title: 'Security Check Prompt',
    description: 'Mock prompt for prompts/list and prompts/get demo.',
    argsSchema: {
      target: z.string().optional(),
    },
  },
  ({ target }) => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Review this target for risky operations: ${target ?? 'workspace'}`,
          },
        },
      ],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Mock MCP server failed to start:', error);
  process.exit(1);
});
