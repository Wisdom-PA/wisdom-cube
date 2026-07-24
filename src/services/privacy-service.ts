import { InvalidInputError } from '../errors.ts';
import type { ConfigRepository } from '../repositories/config-repo.ts';
import type { ProfileRepository } from '../repositories/profile-repo.ts';

export type PrivacyMode = 'normal' | 'paranoid';
export type PrivacyTrigger = 'voice' | 'app' | 'permission_grant';

export interface ChainPrivacy {
  chainId: string;
  mode: PrivacyMode;
  changes: Array<{
    atTs: string;
    fromMode: PrivacyMode;
    toMode: PrivacyMode;
    trigger: PrivacyTrigger;
  }>;
}

export class PrivacyService {
  private readonly configRepo: ConfigRepository;
  private readonly profileRepo: ProfileRepository;
  private readonly activeChains = new Map<string, ChainPrivacy>();

  constructor(configRepo: ConfigRepository, profileRepo: ProfileRepository) {
    this.configRepo = configRepo;
    this.profileRepo = profileRepo;
  }

  async startChainPrivacy(chainId: string): Promise<ChainPrivacy> {
    const config = await this.configRepo.get();
    const privacy: ChainPrivacy = {
      chainId,
      mode: config.defaultPrivacyMode as PrivacyMode,
      changes: [],
    };
    this.activeChains.set(chainId, privacy);
    return privacy;
  }

  getChainPrivacy(chainId: string): ChainPrivacy | undefined {
    return this.activeChains.get(chainId);
  }

  async switchMode(
    chainId: string,
    profileId: string,
    toMode: PrivacyMode,
    trigger: PrivacyTrigger
  ): Promise<ChainPrivacy> {
    const chain = this.activeChains.get(chainId);
    if (!chain) {
      throw new InvalidInputError(`No active chain ${chainId}`);
    }

    const profile = await this.profileRepo.findById(profileId);
    if (profile?.role !== 'adult') {
      throw new InvalidInputError('Only adult profiles can switch privacy mode');
    }

    if (chain.mode === toMode) {
      return chain;
    }

    chain.changes.push({
      atTs: new Date().toISOString(),
      fromMode: chain.mode,
      toMode,
      trigger,
    });
    chain.mode = toMode;
    return chain;
  }

  async grantInternetAccess(chainId: string, profileId: string): Promise<ChainPrivacy> {
    return this.switchMode(chainId, profileId, 'normal', 'permission_grant');
  }

  endChainPrivacy(chainId: string): void {
    this.activeChains.delete(chainId);
  }

  async updateDefaultMode(mode: PrivacyMode): Promise<void> {
    await this.configRepo.patch({ defaultPrivacyMode: mode });
  }
}
