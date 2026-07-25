import type { ConfigRepository } from '../repositories/config-repo.ts';
import type { ProfileRepository } from '../repositories/profile-repo.ts';
import type { PrivacyMode } from './privacy-service.ts';

const DEFAULT_CONSENT_TTL_MS = 15 * 60 * 1000;

export interface InternetPermissionInput {
  profileId: string | null;
  allowInternet: boolean;
  chainPrivacyMode: PrivacyMode;
}

export interface InternetPermissionDecision {
  allowed: boolean;
  reason: string;
}

export class InternetPermissionService {
  private readonly configRepo: ConfigRepository;
  private readonly profileRepo: ProfileRepository;
  private readonly sessionConsent = new Map<string, number>();

  constructor(configRepo: ConfigRepository, profileRepo: ProfileRepository) {
    this.configRepo = configRepo;
    this.profileRepo = profileRepo;
  }

  grantSessionConsent(profileId: string, ttlMs?: number): { expiresAt: string } {
    const ttl = ttlMs ?? DEFAULT_CONSENT_TTL_MS;
    const expiresAtMs = Date.now() + ttl;
    this.sessionConsent.set(profileId, expiresAtMs);
    return { expiresAt: new Date(expiresAtMs).toISOString() };
  }

  hasSessionConsent(profileId: string): boolean {
    const expiresAtMs = this.sessionConsent.get(profileId);
    if (expiresAtMs === undefined) return false;
    if (Date.now() >= expiresAtMs) {
      this.sessionConsent.delete(profileId);
      return false;
    }
    return true;
  }

  revokeSessionConsent(profileId: string): void {
    this.sessionConsent.delete(profileId);
  }

  getConsentExpiry(profileId: string): string | null {
    if (!this.hasSessionConsent(profileId)) return null;
    const expiresAtMs = this.sessionConsent.get(profileId);
    return expiresAtMs === undefined ? null : new Date(expiresAtMs).toISOString();
  }

  async evaluate(input: InternetPermissionInput): Promise<InternetPermissionDecision> {
    const config = await this.configRepo.get();
    if (config.offlineModeEnabled) {
      return { allowed: false, reason: 'offline_mode' };
    }

    if (!input.profileId) {
      return { allowed: false, reason: 'no_profile' };
    }

    const profile = await this.profileRepo.findById(input.profileId);
    if (!profile) {
      return { allowed: false, reason: 'no_profile' };
    }

    if (profile.role === 'guest') {
      if (!this.hasExplicitConsent(input.profileId, input.allowInternet)) {
        return { allowed: false, reason: 'guest_requires_consent' };
      }
    }

    if (profile.internetPolicy === 'never') {
      return { allowed: false, reason: 'policy_never' };
    }

    const policyNeedsConsent =
      profile.internetPolicy === 'ask_every_time' || profile.internetPolicy === 'allowed_with_prompt';
    if (
      (policyNeedsConsent || input.chainPrivacyMode === 'paranoid') &&
      !this.hasExplicitConsent(input.profileId, input.allowInternet)
    ) {
      return {
        allowed: false,
        reason: input.chainPrivacyMode === 'paranoid' ? 'paranoid_requires_consent' : 'consent_required',
      };
    }

    return { allowed: true, reason: 'allowed' };
  }

  private hasExplicitConsent(profileId: string, allowInternet: boolean): boolean {
    return allowInternet || this.hasSessionConsent(profileId);
  }
}
