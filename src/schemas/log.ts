import { z } from 'zod';

export const logIntentSchema = z.object({
  chainId: z.string(),
  intentIndex: z.number().int().min(0),
  ts: z.string(),
  utterance: z.string(),
  type: z.string(),
  targets: z.array(z.string()),
  parameters: z.record(z.string(), z.string()),
  profileId: z.string().nullable(),
});

export type LogIntent = z.infer<typeof logIntentSchema>;

export const logActionSchema = z.object({
  chainId: z.string(),
  actionIndex: z.number().int().min(0),
  intentIndex: z.number().int().min(0),
  ts: z.string(),
  deviceId: z.string(),
  beforeState: z.record(z.string(), z.unknown()),
  afterState: z.record(z.string(), z.unknown()),
  result: z.enum(['success', 'failure']),
  errorMessage: z.string().nullable(),
});

export type LogAction = z.infer<typeof logActionSchema>;

export const logInternetCallSchema = z.object({
  chainId: z.string(),
  callIndex: z.number().int().min(0),
  ts: z.string(),
  deviceId: z.string(),
  profileId: z.string().nullable(),
  summary: z.string(),
  serviceCategory: z.string(),
  endpoint: z.string(),
  result: z.enum(['allowed', 'blocked', 'error']),
  errorMessage: z.string().nullable(),
});

export type LogInternetCall = z.infer<typeof logInternetCallSchema>;

export const chainSummarySchema = z.object({
  chainId: z.string(),
  deviceId: z.string(),
  chainStartTs: z.string(),
  chainEndTs: z.string().nullable(),
  initialProfileId: z.string().nullable(),
  identifiedAtTs: z.string().nullable(),
  identifiedProfileId: z.string().nullable(),
  privacyModeChanges: z.array(
    z.object({
      atTs: z.string(),
      fromMode: z.enum(['paranoid', 'normal']),
      toMode: z.enum(['paranoid', 'normal']),
      trigger: z.enum(['voice', 'app', 'permission_grant']),
    })
  ),
});

export type ChainSummary = z.infer<typeof chainSummarySchema>;

export const logEntrySchema = z.object({
  chain: chainSummarySchema,
  intents: z.array(logIntentSchema),
  actions: z.array(logActionSchema),
  internetCalls: z.array(logInternetCallSchema),
});

export type LogEntry = z.infer<typeof logEntrySchema>;

export const logQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  profileId: z.string().optional(),
  deviceId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type LogQuery = z.infer<typeof logQuerySchema>;
