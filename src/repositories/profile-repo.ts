import { randomUUID } from 'node:crypto';
import type { CreateProfile, PatchProfile, Profile } from '../schemas/profile.ts';

export interface ProfileRepository {
  findAll(): Promise<Profile[]>;
  findById(profileId: string): Promise<Profile | undefined>;
  existsByName(name: string): Promise<boolean>;
  insert(input: CreateProfile): Promise<Profile>;
  patch(profileId: string, updates: PatchProfile): Promise<Profile | undefined>;
  remove(profileId: string): Promise<boolean>;
}

export class InMemoryProfileRepository implements ProfileRepository {
  private readonly profiles = new Map<string, Profile>();

  async findAll(): Promise<Profile[]> {
    return [...this.profiles.values()];
  }

  async findById(profileId: string): Promise<Profile | undefined> {
    return this.profiles.get(profileId);
  }

  async existsByName(name: string): Promise<boolean> {
    const lower = name.toLowerCase();
    return [...this.profiles.values()].some((p) => p.preferredName.toLowerCase() === lower);
  }

  async insert(input: CreateProfile): Promise<Profile> {
    const profile: Profile = {
      profileId: randomUUID(),
      preferredName: input.preferredName,
      role: input.role,
      language: input.language,
      voiceVerbosity: input.voiceVerbosity,
      internetPolicy: input.internetPolicy,
      linkedAdults: input.linkedAdults,
      createdAt: new Date().toISOString(),
    };
    this.profiles.set(profile.profileId, profile);
    return { ...profile };
  }

  async patch(profileId: string, updates: PatchProfile): Promise<Profile | undefined> {
    const existing = this.profiles.get(profileId);
    if (!existing) return undefined;

    const updated: Profile = { ...existing };
    if (updates.preferredName !== undefined) updated.preferredName = updates.preferredName;
    if (updates.language !== undefined) updated.language = updates.language;
    if (updates.voiceVerbosity !== undefined) updated.voiceVerbosity = updates.voiceVerbosity;
    if (updates.internetPolicy !== undefined) updated.internetPolicy = updates.internetPolicy;
    if (updates.linkedAdults !== undefined) updated.linkedAdults = updates.linkedAdults;
    this.profiles.set(profileId, updated);
    return { ...updated };
  }

  async remove(profileId: string): Promise<boolean> {
    return this.profiles.delete(profileId);
  }
}
