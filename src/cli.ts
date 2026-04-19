#!/usr/bin/env node

import { Command } from 'commander';
import { createRuntimeLogger } from './audit/logger';
import { loadConfig } from './config';
import { ClientManager } from './gateway/client-manager';
import { McpForwarder } from './gateway/forwarder';
import { startServer } from './server';

const program = new Command();
let shutdownRequested = false;

async function attachGracefulShutdown(close: () => Promise<void>): Promise<void> {
  const shutdown = async (signal: string): Promise<void> => {
    if (shutdownRequested) {
      return;
    }

    shutdownRequested = true;
    console.log(`Received ${signal}. Shutting down mcp-firewall...`);

    try {
      await close();
      process.exit(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Shutdown failed: ${message}`);
      process.exit(1);
    }
  };

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

program
  .name('mcp-firewall')
  .description('A policy firewall for MCP servers')
  .version('0.1.0')
  .showHelpAfterError('(add --help for additional usage details)')
  .showSuggestionAfterError();

program
  .command('start')
  .description('Start the policy firewall server')
  .option('-c, --config <path>', 'Path to config file', './config.json')
  .action(async (options) => {
    console.log(`Starting mcp-firewall with config: ${options.config}`);
    const config = loadConfig(options.config);
    const runningServer = await startServer(config);
    await attachGracefulShutdown(() => runningServer.close());

    console.log(`Firewall is ready at http://${runningServer.host}:${runningServer.port}`);
  });

program
  .command('list')
  .description('List unified tools, resources, and prompts across connected servers')
  .option('-c, --config <path>', 'Path to config file', './config.json')
  .action(async (options) => {
    const config = loadConfig(options.config);
    const logger = createRuntimeLogger(config.logging);
    const clientManager = new ClientManager(config.servers, logger);
    const forwarder = new McpForwarder(clientManager);

    try {
      const connectionResult = await clientManager.connectAll();
      console.log(`Connected servers: ${connectionResult.connected.join(', ') || 'none'}`);

      if (connectionResult.failed.length > 0) {
        console.log('Failed servers:');
        for (const failure of connectionResult.failed) {
          console.log(`  - ${failure.name}: ${failure.error}`);
        }
      }

      if (connectionResult.connected.length === 0) {
        process.exitCode = 1;
        return;
      }

      const [toolsResult, resourcesResult, promptsResult] = await Promise.all([
        forwarder.listTools(),
        forwarder.listResources(),
        forwarder.listPrompts(),
      ]);

      const tools = Array.isArray(toolsResult.tools) ? toolsResult.tools : [];
      const resources = Array.isArray(resourcesResult.resources) ? resourcesResult.resources : [];
      const prompts = Array.isArray(promptsResult.prompts) ? promptsResult.prompts : [];

      console.log(`Tools (${tools.length}):`);
      for (const tool of tools) {
        const name =
          tool && typeof tool === 'object' && 'name' in tool && typeof tool.name === 'string'
            ? tool.name
            : 'unnamed-tool';
        console.log(`  - ${name}`);
      }

      console.log(`Resources (${resources.length}):`);
      for (const resource of resources) {
        const uri =
          resource &&
          typeof resource === 'object' &&
          'uri' in resource &&
          typeof resource.uri === 'string'
            ? resource.uri
            : 'unknown://resource';
        console.log(`  - ${uri}`);
      }

      console.log(`Prompts (${prompts.length}):`);
      for (const prompt of prompts) {
        const name =
          prompt &&
          typeof prompt === 'object' &&
          'name' in prompt &&
          typeof prompt.name === 'string'
            ? prompt.name
            : 'unnamed-prompt';
        console.log(`  - ${name}`);
      }
    } finally {
      await clientManager.closeAll();
    }
  });

program.parseAsync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
