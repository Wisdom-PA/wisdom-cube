import { randomUUID } from 'node:crypto';
import type { CubeConfig, PatchConfig } from '../schemas/config.ts';

export interface ConfigRepository {
  get(): Promise<CubeConfig>;
  patch(updates: PatchConfig): Promise<CubeConfig>;
  replace(config: CubeConfig): Promise<CubeConfig>;
}

export class InMemoryConfigRepository implements ConfigRepository {
  private config: CubeConfig = {
    cubeId: randomUUID(),
    defaultPrivacyMode: 'paranoid',
    offlineModeEnabled: false,
    timezone: 'UTC',
    locale: 'en',
    wakeWord: 'hey wisdom',
    voiceVerbosity: 'normal',
  };

  async get(): Promise<CubeConfig> {
    return { ...this.config };
  }

  async patch(updates: PatchConfig): Promise<CubeConfig> {
    if (updates.defaultPrivacyMode !== undefined) this.config.defaultPrivacyMode = updates.defaultPrivacyMode;
    if (updates.offlineModeEnabled !== undefined) this.config.offlineModeEnabled = updates.offlineModeEnabled;
    if (updates.timezone !== undefined) this.config.timezone = updates.timezone;
    if (updates.locale !== undefined) this.config.locale = updates.locale;
    if (updates.wakeWord !== undefined) this.config.wakeWord = updates.wakeWord;
    if (updates.voiceVerbosity !== undefined) this.config.voiceVerbosity = updates.voiceVerbosity;
    return { ...this.config };
  }

  async replace(config: CubeConfig): Promise<CubeConfig> {
    this.config = { ...config };
    return { ...this.config };
  }
}
