import { z } from 'zod';

const scopeListSchema = z
  .object({
    allow: z.array(z.string()).default([]),
    deny: z.array(z.string()).default([]),
  })
  .strict();

const policySchema = z
  .object({
    mode: z.enum(['allowlist', 'hybrid']).default('hybrid'),
    tools: z
      .object({
        allow: z.array(z.string()).default([]),
        deny: z.array(z.string()).default([]),
        requireConfirmation: z.array(z.string()).default([]),
      })
      .strict()
      .default({
        allow: [],
        deny: [],
        requireConfirmation: [],
      }),
    scope: z
      .object({
        paths: scopeListSchema.default({ allow: [], deny: [] }),
        repos: scopeListSchema.default({ allow: [], deny: [] }),
        domains: scopeListSchema.default({ allow: [], deny: [] }),
      })
      .strict()
      .default({
        paths: { allow: [], deny: [] },
        repos: { allow: [], deny: [] },
        domains: { allow: [], deny: [] },
      }),
    redaction: z
      .object({
        enabled: z.boolean().default(true),
        extraPatterns: z.array(z.string()).default([]),
      })
      .strict()
      .default({ enabled: true, extraPatterns: [] }),
    defaults: z
      .object({
        onUnknownTool: z.enum(['allow', 'deny']).default('allow'),
      })
      .strict()
      .default({ onUnknownTool: 'allow' }),
  })
  .strict();

const baseServerSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .regex(/^[a-zA-Z0-9-]+$/, 'Server name must be alphanumeric with optional dashes'),
    timeoutMs: z.number().int().positive().default(15000),
  })
  .strict();

const stdioServerSchema = baseServerSchema
  .extend({
    type: z.literal('stdio'),
    command: z.string().min(1),
    args: z.array(z.string()).default([]),
    env: z.record(z.string(), z.string()).optional(),
    cwd: z.string().optional(),
  })
  .strict();

const sseServerSchema = baseServerSchema
  .extend({
    type: z.literal('sse'),
    url: z.string().url(),
    headers: z.record(z.string(), z.string()).optional(),
  })
  .strict();

const loggingSchema = z
  .object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    filePath: z.string().optional(),
  })
  .strict();

export const firewallConfigSchema = z
  .object({
    host: z.string().min(1).default('127.0.0.1'),
    port: z.number().int().min(1).max(65535).default(8787),
    strictStartup: z.boolean().default(false),
    servers: z
      .array(z.discriminatedUnion('type', [stdioServerSchema, sseServerSchema]))
      .default([]),
    policy: policySchema.default({
      mode: 'hybrid',
      tools: { allow: [], deny: [], requireConfirmation: [] },
      scope: {
        paths: { allow: [], deny: [] },
        repos: { allow: [], deny: [] },
        domains: { allow: [], deny: [] },
      },
      redaction: { enabled: true, extraPatterns: [] },
      defaults: { onUnknownTool: 'allow' },
    }),
    logging: loggingSchema.default({ level: 'info' }),
  })
  .strict()
  .superRefine((value, ctx) => {
    const names = new Set<string>();
    for (const server of value.servers) {
      if (names.has(server.name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate server name: ${server.name}`,
          path: ['servers'],
        });
      }
      names.add(server.name);
    }
  });

export type FirewallConfigInput = z.input<typeof firewallConfigSchema>;
