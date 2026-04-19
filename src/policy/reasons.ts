import type { PolicyDecision } from '../types';

export const ReasonCodes = {
  TOOL_DENIED: 'tool_denied',
  SCOPE_DENIED: 'scope_denied',
  CONFIRMATION_REQUIRED: 'confirmation_required',
  NOT_ALLOWLISTED: 'not_allowlisted',
} as const;

export function allowDecision(policyId = 'policy.allow.default'): PolicyDecision {
  return {
    outcome: 'allow',
    code: 'allowed',
    message: 'Request allowed by policy.',
    policyId,
  };
}

export function denyDecision(options: {
  code: string;
  message: string;
  policyId: string;
  matchedRule?: string;
  remediationHint?: string;
}): PolicyDecision {
  return {
    outcome: 'deny',
    code: options.code,
    message: options.message,
    policyId: options.policyId,
    matchedRule: options.matchedRule,
    remediationHint: options.remediationHint,
  };
}
