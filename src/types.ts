export type FirewallMode = 'allowlist' | 'hybrid';
export type DecisionOutcome = 'allow' | 'deny';

export interface ToolPolicyConfig {
  allow: string[];
  deny: string[];
  requireConfirmation: string[];
}

export interface ScopeListConfig {
  allow: string[];
  deny: string[];
}

export interface ScopePolicyConfig {
  paths: ScopeListConfig;
  repos: ScopeListConfig;
  domains: ScopeListConfig;
}

export interface RedactionPolicyConfig {
  enabled: boolean;
  extraPatterns: string[];
}

export interface DefaultsPolicyConfig {
  onUnknownTool: 'allow' | 'deny';
}

export interface FirewallPolicyConfig {
  mode: FirewallMode;
  tools: ToolPolicyConfig;
  scope: ScopePolicyConfig;
  redaction: RedactionPolicyConfig;
  defaults: DefaultsPolicyConfig;
}

export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  filePath?: string;
}

export interface BaseServerConfig {
  name: string;
  timeoutMs: number;
}

export interface StdioServerConfig extends BaseServerConfig {
  type: 'stdio';
  command: string;
  args: string[];
  env?: Record<string, string>;
  cwd?: string;
}

export interface SseServerConfig extends BaseServerConfig {
  type: 'sse';
  url: string;
  headers?: Record<string, string>;
}

export type DownstreamServerConfig = StdioServerConfig | SseServerConfig;

export interface FirewallConfig {
  host: string;
  port: number;
  strictStartup: boolean;
  servers: DownstreamServerConfig[];
  policy: FirewallPolicyConfig;
  logging: LoggingConfig;
}

export interface ScopeTargets {
  path?: string;
  repo?: string;
  domain?: string;
}

export interface DecisionContext {
  method: string;
  toolName?: string;
  arguments?: Record<string, unknown>;
  targets: ScopeTargets;
}

export interface PolicyDecision {
  outcome: DecisionOutcome;
  code: string;
  message: string;
  policyId: string;
  matchedRule?: string;
  remediationHint?: string;
}

export interface ConnectionResult {
  connected: string[];
  failed: Array<{ name: string; error: string }>;
}

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcSuccessResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result: unknown;
}

export interface JsonRpcErrorResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  error: JsonRpcError;
}

export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

export interface AuditEvent {
  requestId: string | number | null;
  method: string;
  toolName?: string;
  serverName?: string;
  outcome: 'allowed' | 'denied';
  policyId: string;
  reason: string;
  matchedRule?: string;
  redactionCount: number;
  redactionTypes: string[];
  latencyMs: number;
}
