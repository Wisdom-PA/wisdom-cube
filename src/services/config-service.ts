import type { ConfigRepository } from '../repositories/config-repo.ts';
import type { CubeConfig, PatchConfig } from '../schemas/config.ts';

export class ConfigService {
  private readonly repo: ConfigRepository;

  constructor(repo: ConfigRepository) {
    this.repo = repo;
  }

  async get(): Promise<CubeConfig> {
    return this.repo.get();
  }

  async patch(updates: PatchConfig): Promise<CubeConfig> {
    return this.repo.patch(updates);
  }
}
