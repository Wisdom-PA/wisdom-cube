import { z } from 'zod';

export const grantConsentBodySchema = z.object({
  profileId: z.string().min(1),
  ttlMs: z
    .number()
    .int()
    .positive()
    .max(24 * 60 * 60 * 1000)
    .optional(),
});

export type GrantConsentBody = z.infer<typeof grantConsentBodySchema>;

export const grantConsentResponseSchema = z.object({
  expiresAt: z.string(),
});

export const consentStatusSchema = z.object({
  active: z.boolean(),
  expiresAt: z.string().nullable(),
});
