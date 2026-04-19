import type { Server as HttpServer } from 'node:http';
import cors from 'cors';
import express from 'express';
import { z } from 'zod';
import { createRuntimeLogger } from './audit/logger';
import { ClientManager } from './gateway/client-manager';
import { McpForwarder } from './gateway/forwarder';
import { buildDecisionContext, PolicyEngine } from './policy/engine';
import { redactUnknown } from './redaction/redact';
import type {
  FirewallConfig,
  JsonRpcErrorResponse,
  JsonRpcRequest,
  JsonRpcResponse,
} from './types';

const jsonRpcRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number(), z.null()]).optional(),
  method: z.string().min(1),
  params: z.record(z.string(), z.unknown()).optional(),
});

export interface RunningServer {
  host: string;
  port: number;
  close(): Promise<void>;
}

function toErrorResponse(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcErrorResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      data,
    },
  };
}

function inferServerName(
  method: string,
  params: Record<string, unknown> | undefined,
): string | undefined {
  if (!params) {
    return undefined;
  }

  if ((method === 'tools/call' || method === 'prompts/get') && typeof params.name === 'string') {
    if (!params.name.includes('__')) {
      return undefined;
    }
    const [serverName] = params.name.split('__');
    return serverName;
  }

  if (
    method === 'resources/read' &&
    typeof params.uri === 'string' &&
    params.uri.startsWith('mcpfw://')
  ) {
    const withoutScheme = params.uri.slice('mcpfw://'.length);
    return withoutScheme.split('/')[0];
  }

  return undefined;
}

export async function startServer(config: FirewallConfig): Promise<RunningServer> {
  const logger = createRuntimeLogger(config.logging);
  const policyEngine = new PolicyEngine(config.policy);
  const clientManager = new ClientManager(config.servers, logger);
  const connectionResult = await clientManager.connectAll();

  logger.info('Downstream connection summary', connectionResult);

  if (config.strictStartup && connectionResult.failed.length > 0) {
    await clientManager.closeAll();
    throw new Error('Strict startup enabled and one or more downstream servers failed to connect.');
  }

  const forwarder = new McpForwarder(clientManager);

  const app = express();
  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '2mb', strict: true }));

  app.get('/health', (_req, res) => {
    const connectedServers = clientManager.getEntries().map(([name]) => name);
    res.json({
      status: 'ok',
      connectedServers,
      connectedCount: connectedServers.length,
      totalConfiguredServers: config.servers.length,
    });
  });

  app.post('/mcp', async (req, res) => {
    const parseResult = jsonRpcRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res
        .status(400)
        .json(
          toErrorResponse(
            null,
            -32600,
            'Invalid JSON-RPC request payload.',
            parseResult.error.flatten(),
          ),
        );
      return;
    }

    const request = parseResult.data as JsonRpcRequest;
    const requestId = request.id ?? null;
    const startedAt = Date.now();
    const decisionContext = buildDecisionContext(request.method, request.params);
    const policyDecision = policyEngine.evaluate(decisionContext);

    const redactionSummary = config.policy.redaction.enabled
      ? redactUnknown(request.params ?? {}, config.policy.redaction.extraPatterns)
      : { value: request.params ?? {}, redactionCount: 0, redactionTypes: [] };

    if (policyDecision.outcome === 'deny') {
      logger.audit({
        requestId,
        method: request.method,
        toolName: decisionContext.toolName,
        serverName: inferServerName(request.method, request.params),
        outcome: 'denied',
        policyId: policyDecision.policyId,
        reason: policyDecision.message,
        matchedRule: policyDecision.matchedRule,
        redactionCount: redactionSummary.redactionCount,
        redactionTypes: redactionSummary.redactionTypes,
        latencyMs: Date.now() - startedAt,
      });

      const denyResponse = toErrorResponse(requestId, -32010, policyDecision.message, {
        code: policyDecision.code,
        policyId: policyDecision.policyId,
        matchedRule: policyDecision.matchedRule,
        remediationHint: policyDecision.remediationHint,
      });

      res.status(403).json(denyResponse);
      return;
    }

    try {
      const result = await forwarder.dispatch(request.method, request.params ?? {});
      const response: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: requestId,
        result,
      };

      logger.audit({
        requestId,
        method: request.method,
        toolName: decisionContext.toolName,
        serverName: inferServerName(request.method, request.params),
        outcome: 'allowed',
        policyId: policyDecision.policyId,
        reason: 'Request allowed by policy.',
        matchedRule: policyDecision.matchedRule,
        redactionCount: redactionSummary.redactionCount,
        redactionTypes: redactionSummary.redactionTypes,
        latencyMs: Date.now() - startedAt,
      });

      res.json(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      logger.error('Request forwarding failed', {
        method: request.method,
        requestId,
        error: message,
        redactedParams: redactionSummary.value,
      });

      res.status(500).json(toErrorResponse(requestId, -32603, message));
    }
  });

  const httpServer = await new Promise<HttpServer>((resolve, reject) => {
    const instance = app.listen(config.port, config.host);

    instance.once('error', (error) => {
      reject(error);
    });

    instance.once('listening', () => {
      logger.info('mcp-firewall is listening', {
        host: config.host,
        port: config.port,
      });
      resolve(instance);
    });
  });

  httpServer.requestTimeout = 30_000;

  return {
    host: config.host,
    port: config.port,
    async close(): Promise<void> {
      await clientManager.closeAll();
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}
