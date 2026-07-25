import { ConflictError, InvalidInputError, NotFoundError } from '../errors.ts';
import type { ProfileRepository } from '../repositories/profile-repo.ts';
import type { CreateProfile, PatchProfile, Profile } from '../schemas/profile.ts';

export class ProfileService {
  private readonly repo: ProfileRepository;

  constructor(repo: ProfileRepository) {
    this.repo = repo;
  }

  async list(): Promise<Profile[]> {
    return this.repo.findAll();
  }

  async get(profileId: string): Promise<Profile> {
    const profile = await this.repo.findById(profileId);
    if (!profile) {
      throw new NotFoundError(`Profile ${profileId} not found`);
    }
    return profile;
  }

  async create(input: CreateProfile): Promise<Profile> {
    const name = input.preferredName.trim();
    if (name.length === 0) {
      throw new InvalidInputError('Profile name must not be blank');
    }
    if (await this.repo.existsByName(name)) {
      throw new ConflictError(`Profile named "${name}" already exists`);
    }
    if (input.role === 'child' && input.internetPolicy !== 'never') {
      throw new InvalidInputError('Child profiles must have internet policy "never"');
    }
    return this.repo.insert({ ...input, preferredName: name });
  }

  async patch(profileId: string, updates: PatchProfile): Promise<Profile> {
    const existing = await this.repo.findById(profileId);
    if (!existing) {
      throw new NotFoundError(`Profile ${profileId} not found`);
    }
    if (updates.internetPolicy !== undefined && existing.role === 'child' && updates.internetPolicy !== 'never') {
      throw new InvalidInputError('Child profiles must have internet policy "never"');
    }
    const updated = await this.repo.patch(profileId, updates);
    if (!updated) {
      throw new NotFoundError(`Profile ${profileId} not found`);
    }
    return updated;
  }

  async remove(profileId: string): Promise<void> {
    const deleted = await this.repo.remove(profileId);
    if (!deleted) {
      throw new NotFoundError(`Profile ${profileId} not found`);
    }
  }

  async isAdult(profileId: string): Promise<boolean> {
    const profile = await this.get(profileId);
    return profile.role === 'adult';
  }

  async canModifySettings(profileId: string): Promise<boolean> {
    const profile = await this.get(profileId);
    return profile.role === 'adult';
  }

  async canAccessInternet(profileId: string): Promise<boolean> {
    const profile = await this.get(profileId);
    return profile.internetPolicy !== 'never';
  }

  async getLinkedAdults(profileId: string): Promise<Profile[]> {
    const profile = await this.get(profileId);
    if (profile.role !== 'child' || profile.linkedAdults.length === 0) {
      return [];
    }
    const adults: Profile[] = [];
    for (const adultId of profile.linkedAdults) {
      const adult = await this.repo.findById(adultId);
      if (adult) adults.push(adult);
    }
    return adults;
  }
}
