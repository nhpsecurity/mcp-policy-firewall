import fs from 'node:fs';
import path from 'node:path';
import { firewallConfigSchema } from './schema';
import type { DownstreamServerConfig, FirewallConfig } from '../types';

function interpolateEnvironmentVariables(value: string): string {
  return value.replace(/\$\{([A-Z0-9_]+)\}/gi, (_match, varName: string) => {
    return process.env[varName] ?? '';
  });
}

function mapRecordValues(
  record: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!record) {
    return undefined;
  }

  const mapped: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    mapped[key] = interpolateEnvironmentVariables(value);
  }
  return mapped;
}

function resolveServerInterpolation(server: DownstreamServerConfig): DownstreamServerConfig {
  if (server.type === 'stdio') {
    return {
      ...server,
      command: interpolateEnvironmentVariables(server.command),
      args: server.args.map((arg) => interpolateEnvironmentVariables(arg)),
      cwd: server.cwd ? interpolateEnvironmentVariables(server.cwd) : undefined,
      env: mapRecordValues(server.env),
    };
  }

  return {
    ...server,
    url: interpolateEnvironmentVariables(server.url),
    headers: mapRecordValues(server.headers),
  };
}

export function parseConfig(rawConfig: unknown): FirewallConfig {
  const parsed = firewallConfigSchema.parse(rawConfig);
  return {
    ...parsed,
    servers: parsed.servers.map((server) => resolveServerInterpolation(server)),
  };
}

export function loadConfig(configPath: string): FirewallConfig {
  const absolutePath = path.resolve(process.cwd(), configPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Config file not found: ${absolutePath}`);
  }

  try {
    const fileContent = fs.readFileSync(absolutePath, 'utf8');
    const rawConfig = JSON.parse(fileContent) as unknown;
    return parseConfig(rawConfig);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load config '${absolutePath}': ${message}`);
  }
}
