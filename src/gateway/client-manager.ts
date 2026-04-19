import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { ConnectionResult, DownstreamServerConfig } from '../types';
import type { RuntimeLogger } from '../audit/logger';

function stringOnlyEnvironment(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string') {
      env[key] = value;
    }
  }
  return env;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export class ClientManager {
  private readonly clients = new Map<string, Client>();

  constructor(
    private readonly servers: DownstreamServerConfig[],
    private readonly logger: RuntimeLogger,
  ) {}

  private createTransport(
    server: DownstreamServerConfig,
  ): StdioClientTransport | SSEClientTransport {
    if (server.type === 'stdio') {
      return new StdioClientTransport({
        command: server.command,
        args: server.args,
        env: {
          ...stringOnlyEnvironment(),
          ...(server.env ?? {}),
        },
        cwd: server.cwd,
      });
    }

    const url = new URL(server.url);
    return new SSEClientTransport(url, {
      requestInit: {
        headers: server.headers,
      },
    });
  }

  private async connectServer(server: DownstreamServerConfig): Promise<void> {
    const client = new Client(
      {
        name: `mcp-firewall-${server.name}`,
        version: '0.1.0',
      },
      {
        capabilities: {},
      },
    );

    const transport = this.createTransport(server);
    await withTimeout(
      client.connect(transport),
      server.timeoutMs,
      `Connection timed out for server '${server.name}'`,
    );

    this.clients.set(server.name, client);
    this.logger.info('Connected downstream MCP server', { server: server.name, type: server.type });
  }

  async connectAll(): Promise<ConnectionResult> {
    const result: ConnectionResult = {
      connected: [],
      failed: [],
    };

    const settled = await Promise.allSettled(
      this.servers.map((server) => this.connectServer(server)),
    );

    for (const [index, attempt] of settled.entries()) {
      const serverName = this.servers[index]?.name ?? `unknown-${index}`;
      if (attempt.status === 'fulfilled') {
        result.connected.push(serverName);
      } else {
        const message =
          attempt.reason instanceof Error ? attempt.reason.message : String(attempt.reason);
        result.failed.push({ name: serverName, error: message });
        this.logger.warn('Failed to connect downstream MCP server', {
          server: serverName,
          error: message,
        });
      }
    }

    return result;
  }

  getClient(name: string): Client | undefined {
    return this.clients.get(name);
  }

  getEntries(): Array<[string, Client]> {
    return [...this.clients.entries()];
  }

  async closeAll(): Promise<void> {
    await Promise.allSettled(
      [...this.clients.values()].map(async (client) => {
        await client.close();
      }),
    );
    this.clients.clear();
  }
}
