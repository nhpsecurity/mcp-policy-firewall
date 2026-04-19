import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { ClientManager } from './client-manager';

const NAME_SEPARATOR = '__';
const RESOURCE_SCHEME = 'mcpfw://';

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getNameParts(
  input: string,
  connectedServers: string[],
): { server: string; localName: string } {
  if (input.includes(NAME_SEPARATOR)) {
    const separatorIndex = input.indexOf(NAME_SEPARATOR);
    const server = input.slice(0, separatorIndex).trim();
    const localName = input.slice(separatorIndex + NAME_SEPARATOR.length).trim();

    if (!server || !localName) {
      throw new Error(
        `Invalid namespaced item name '${input}'. Expected format '<server>${NAME_SEPARATOR}<name>'.`,
      );
    }

    return { server, localName };
  }

  if (connectedServers.length === 1) {
    return { server: connectedServers[0], localName: input };
  }

  if (connectedServers.length === 0) {
    throw new Error('No downstream MCP servers are connected.');
  }

  throw new Error(
    `Ambiguous item name '${input}'. Prefix with '<server>${NAME_SEPARATOR}<name>' when multiple servers are connected.`,
  );
}

function encodeResourceUri(serverName: string, resourceUri: string): string {
  return `${RESOURCE_SCHEME}${serverName}/${encodeURIComponent(resourceUri)}`;
}

function decodeResourceUri(
  encoded: string,
  connectedServers: string[],
): { server: string; resourceUri: string } {
  if (encoded.startsWith(RESOURCE_SCHEME)) {
    const withoutScheme = encoded.slice(RESOURCE_SCHEME.length);
    const separatorIndex = withoutScheme.indexOf('/');
    if (separatorIndex <= 0) {
      throw new Error(`Invalid namespaced resource uri '${encoded}'.`);
    }

    const server = withoutScheme.slice(0, separatorIndex);
    const body = withoutScheme.slice(separatorIndex + 1);

    if (!server || !body) {
      throw new Error(`Invalid namespaced resource uri '${encoded}'.`);
    }

    return {
      server,
      resourceUri: decodeURIComponent(body),
    };
  }

  if (connectedServers.length === 1) {
    return { server: connectedServers[0], resourceUri: encoded };
  }

  if (connectedServers.length === 0) {
    throw new Error('No downstream MCP servers are connected.');
  }

  throw new Error(
    `Ambiguous resource uri '${encoded}'. Use '${RESOURCE_SCHEME}<server>/<encoded-uri>' when multiple servers are connected.`,
  );
}

export class McpForwarder {
  constructor(private readonly clients: ClientManager) {}

  private isCapabilityError(error: unknown): boolean {
    const message =
      error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    return message.includes('capability') || message.includes('method not found');
  }

  private getConnectedServers(): string[] {
    return this.clients.getEntries().map(([name]) => name);
  }

  private requireClient(serverName: string): Client {
    const client = this.clients.getClient(serverName);
    if (!client) {
      throw new Error(`Server '${serverName}' is not connected.`);
    }

    return client;
  }

  async listTools(): Promise<{ tools: unknown[] }> {
    const mergedTools: unknown[] = [];

    for (const [serverName, client] of this.clients.getEntries()) {
      let response: unknown;
      try {
        response = await client.listTools();
      } catch (error) {
        if (this.isCapabilityError(error)) {
          continue;
        }
        throw error;
      }
      const responseObject = asRecord(response);
      const tools = asArray(responseObject?.tools);

      for (const tool of tools) {
        const toolRecord = asRecord(tool);
        if (!toolRecord) {
          continue;
        }

        const localName = typeof toolRecord.name === 'string' ? toolRecord.name : 'unnamed-tool';
        mergedTools.push({
          ...toolRecord,
          name: `${serverName}${NAME_SEPARATOR}${localName}`,
          _meta: {
            ...(asRecord(toolRecord._meta) ?? {}),
            sourceServer: serverName,
            sourceTool: localName,
          },
        });
      }
    }

    return { tools: mergedTools };
  }

  async callTool(params: Record<string, unknown>): Promise<unknown> {
    const name = typeof params.name === 'string' ? params.name : undefined;
    if (!name) {
      throw new Error('tools/call requires params.name');
    }

    const { server, localName } = getNameParts(name, this.getConnectedServers());
    const client = this.requireClient(server);

    return client.callTool({
      ...params,
      name: localName,
    });
  }

  async listResources(): Promise<{ resources: unknown[] }> {
    const mergedResources: unknown[] = [];

    for (const [serverName, client] of this.clients.getEntries()) {
      let response: unknown;
      try {
        response = await client.listResources();
      } catch (error) {
        if (this.isCapabilityError(error)) {
          continue;
        }
        throw error;
      }
      const responseObject = asRecord(response);
      const resources = asArray(responseObject?.resources);

      for (const resource of resources) {
        const resourceRecord = asRecord(resource);
        if (!resourceRecord) {
          continue;
        }

        const localUri =
          typeof resourceRecord.uri === 'string' ? resourceRecord.uri : 'unknown://resource';
        const localName = typeof resourceRecord.name === 'string' ? resourceRecord.name : localUri;

        mergedResources.push({
          ...resourceRecord,
          name: `${serverName}${NAME_SEPARATOR}${localName}`,
          uri: encodeResourceUri(serverName, localUri),
          _meta: {
            ...(asRecord(resourceRecord._meta) ?? {}),
            sourceServer: serverName,
            sourceUri: localUri,
          },
        });
      }
    }

    return { resources: mergedResources };
  }

  async readResource(params: Record<string, unknown>): Promise<unknown> {
    const uri = typeof params.uri === 'string' ? params.uri : undefined;
    if (!uri) {
      throw new Error('resources/read requires params.uri');
    }

    const { server, resourceUri } = decodeResourceUri(uri, this.getConnectedServers());
    const client = this.requireClient(server);

    return client.readResource({
      ...params,
      uri: resourceUri,
    });
  }

  async listPrompts(): Promise<{ prompts: unknown[] }> {
    const mergedPrompts: unknown[] = [];

    for (const [serverName, client] of this.clients.getEntries()) {
      let response: unknown;
      try {
        response = await client.listPrompts();
      } catch (error) {
        if (this.isCapabilityError(error)) {
          continue;
        }
        throw error;
      }
      const responseObject = asRecord(response);
      const prompts = asArray(responseObject?.prompts);

      for (const prompt of prompts) {
        const promptRecord = asRecord(prompt);
        if (!promptRecord) {
          continue;
        }

        const localName =
          typeof promptRecord.name === 'string' ? promptRecord.name : 'unnamed-prompt';
        mergedPrompts.push({
          ...promptRecord,
          name: `${serverName}${NAME_SEPARATOR}${localName}`,
          _meta: {
            ...(asRecord(promptRecord._meta) ?? {}),
            sourceServer: serverName,
            sourcePrompt: localName,
          },
        });
      }
    }

    return { prompts: mergedPrompts };
  }

  async getPrompt(params: Record<string, unknown>): Promise<unknown> {
    const name = typeof params.name === 'string' ? params.name : undefined;
    if (!name) {
      throw new Error('prompts/get requires params.name');
    }

    const { server, localName } = getNameParts(name, this.getConnectedServers());
    const client = this.requireClient(server);

    return client.getPrompt({
      ...params,
      name: localName,
    });
  }

  async dispatch(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    switch (method) {
      case 'tools/list':
        return this.listTools();
      case 'tools/call':
        return this.callTool(params);
      case 'resources/list':
        return this.listResources();
      case 'resources/read':
        return this.readResource(params);
      case 'prompts/list':
        return this.listPrompts();
      case 'prompts/get':
        return this.getPrompt(params);
      case 'ping':
        return {};
      default:
        throw new Error(`Unsupported MCP method '${method}'.`);
    }
  }
}
