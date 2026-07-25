import { z } from 'zod';

export const profileRole = z.enum(['adult', 'guest', 'child']);
export type ProfileRole = z.infer<typeof profileRole>;

export const internetPolicy = z.enum(['never', 'ask_every_time', 'allowed_with_prompt']);
export type InternetPolicy = z.infer<typeof internetPolicy>;

export const profileSchema = z.object({
  profileId: z.string(),
  preferredName: z.string(),
  role: profileRole,
  language: z.string(),
  voiceVerbosity: z.enum(['short', 'normal']),
  internetPolicy: internetPolicy,
  linkedAdults: z.array(z.string()),
  createdAt: z.string(),
});

export type Profile = z.infer<typeof profileSchema>;

export const createProfileSchema = z.object({
  preferredName: z.string().min(1).max(100),
  role: profileRole,
  language: z.string().min(1).default('en'),
  voiceVerbosity: z.enum(['short', 'normal']).default('normal'),
  internetPolicy: internetPolicy.default('ask_every_time'),
  linkedAdults: z.array(z.string()).default([]),
});

export type CreateProfile = z.infer<typeof createProfileSchema>;

export const patchProfileSchema = z.object({
  preferredName: z.string().min(1).max(100).optional(),
  language: z.string().min(1).optional(),
  voiceVerbosity: z.enum(['short', 'normal']).optional(),
  internetPolicy: internetPolicy.optional(),
  linkedAdults: z.array(z.string()).optional(),
});

export type PatchProfile = z.infer<typeof patchProfileSchema>;
