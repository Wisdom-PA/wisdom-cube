import { describe, expect, it } from 'vitest';
import { InMemoryConfigRepository } from '../src/repositories/config-repo.ts';
import { InMemoryProfileRepository } from '../src/repositories/profile-repo.ts';
import { InternetPermissionService } from '../src/services/internet-permission-service.ts';

describe('InternetPermissionService', () => {
  async function setup(opts?: {
    offline?: boolean;
    role?: 'adult' | 'guest' | 'child';
    policy?: 'never' | 'ask_every_time' | 'allowed_with_prompt';
  }) {
    const configRepo = new InMemoryConfigRepository();
    const profileRepo = new InMemoryProfileRepository();
    if (opts?.offline) {
      await configRepo.patch({ offlineModeEnabled: true });
    }
    const profile = await profileRepo.insert({
      preferredName: 'Test',
      role: opts?.role ?? 'adult',
      language: 'en',
      voiceVerbosity: 'normal',
      internetPolicy: opts?.policy ?? 'ask_every_time',
      linkedAdults: [],
    });
    const service = new InternetPermissionService(configRepo, profileRepo);
    return { service, profileId: profile.profileId, configRepo };
  }

  it('blocks when offline mode is enabled', async () => {
    const { service, profileId } = await setup({ offline: true });
    const result = await service.evaluate({
      profileId,
      allowInternet: true,
      chainPrivacyMode: 'normal',
    });
    expect(result).toEqual({ allowed: false, reason: 'offline_mode' });
  });

  it('blocks when no profile is provided', async () => {
    const { service } = await setup();
    const result = await service.evaluate({
      profileId: null,
      allowInternet: true,
      chainPrivacyMode: 'normal',
    });
    expect(result).toEqual({ allowed: false, reason: 'no_profile' });
  });

  it('blocks never policy even with allowInternet', async () => {
    const { service, profileId } = await setup({ policy: 'never', role: 'child' });
    const result = await service.evaluate({
      profileId,
      allowInternet: true,
      chainPrivacyMode: 'normal',
    });
    expect(result).toEqual({ allowed: false, reason: 'policy_never' });
  });

  it('requires consent for ask_every_time', async () => {
    const { service, profileId } = await setup({ policy: 'ask_every_time' });
    const denied = await service.evaluate({
      profileId,
      allowInternet: false,
      chainPrivacyMode: 'normal',
    });
    expect(denied.allowed).toBe(false);
    expect(denied.reason).toBe('consent_required');

    const allowed = await service.evaluate({
      profileId,
      allowInternet: true,
      chainPrivacyMode: 'normal',
    });
    expect(allowed).toEqual({ allowed: true, reason: 'allowed' });
  });

  it('accepts session consent for allowed_with_prompt', async () => {
    const { service, profileId } = await setup({ policy: 'allowed_with_prompt' });
    service.grantSessionConsent(profileId, 60_000);
    const result = await service.evaluate({
      profileId,
      allowInternet: false,
      chainPrivacyMode: 'normal',
    });
    expect(result.allowed).toBe(true);
  });

  it('requires consent in paranoid mode', async () => {
    const { service, profileId } = await setup({ policy: 'allowed_with_prompt' });
    service.grantSessionConsent(profileId, 60_000);
    // session consent satisfies paranoid check
    const withConsent = await service.evaluate({
      profileId,
      allowInternet: false,
      chainPrivacyMode: 'paranoid',
    });
    expect(withConsent.allowed).toBe(true);

    service.revokeSessionConsent(profileId);
    const without = await service.evaluate({
      profileId,
      allowInternet: false,
      chainPrivacyMode: 'paranoid',
    });
    expect(without.allowed).toBe(false);
    expect(without.reason).toBe('paranoid_requires_consent');
  });

  it('blocks unknown profile ids', async () => {
    const { service } = await setup();
    const result = await service.evaluate({
      profileId: 'missing-profile',
      allowInternet: true,
      chainPrivacyMode: 'normal',
    });
    expect(result).toEqual({ allowed: false, reason: 'no_profile' });
  });

  it('uses default ttl when grantSessionConsent omits ttlMs', async () => {
    const { service, profileId } = await setup();
    const { expiresAt } = service.grantSessionConsent(profileId);
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('requires consent for guests', async () => {
    const { service, profileId } = await setup({ role: 'guest', policy: 'ask_every_time' });
    const denied = await service.evaluate({
      profileId,
      allowInternet: false,
      chainPrivacyMode: 'normal',
    });
    expect(denied.reason).toBe('guest_requires_consent');

    const allowed = await service.evaluate({
      profileId,
      allowInternet: true,
      chainPrivacyMode: 'normal',
    });
    expect(allowed.allowed).toBe(true);
  });

  it('tracks session consent expiry helpers', async () => {
    const { service, profileId } = await setup();
    expect(service.hasSessionConsent(profileId)).toBe(false);
    expect(service.getConsentExpiry(profileId)).toBeNull();

    const { expiresAt } = service.grantSessionConsent(profileId, 60_000);
    expect(service.hasSessionConsent(profileId)).toBe(true);
    expect(service.getConsentExpiry(profileId)).toBe(expiresAt);

    service.revokeSessionConsent(profileId);
    expect(service.hasSessionConsent(profileId)).toBe(false);
  });

  it('expires session consent after ttl', async () => {
    const { service, profileId } = await setup();
    service.grantSessionConsent(profileId, 1);
    await new Promise((r) => setTimeout(r, 5));
    expect(service.hasSessionConsent(profileId)).toBe(false);
  });
});
