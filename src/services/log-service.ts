import { NotFoundError } from '../errors.ts';
import type { LogRepository } from '../repositories/log-repo.ts';
import type { ChainSummary, LogAction, LogEntry, LogIntent, LogInternetCall, LogQuery } from '../schemas/log.ts';

export class LogService {
  private readonly repo: LogRepository;

  constructor(repo: LogRepository) {
    this.repo = repo;
  }

  async query(params: LogQuery): Promise<LogEntry[]> {
    return this.repo.query(params);
  }

  async getChain(chainId: string): Promise<LogEntry> {
    const entry = await this.repo.getChain(chainId);
    if (!entry) {
      throw new NotFoundError(`Chain ${chainId} not found`);
    }
    return entry;
  }

  async startChain(chainId: string, deviceId: string, profileId: string | null): Promise<void> {
    const now = new Date().toISOString();
    await this.repo.appendChain({
      chainId,
      deviceId,
      chainStartTs: now,
      chainEndTs: null,
      initialProfileId: profileId,
      identifiedAtTs: null,
      identifiedProfileId: null,
      privacyModeChanges: [],
    });
  }

  async recordIntent(intent: LogIntent): Promise<void> {
    await this.repo.appendIntent(intent);
  }

  async recordAction(action: LogAction): Promise<void> {
    await this.repo.appendAction(action);
  }

  async recordInternetCall(call: LogInternetCall): Promise<void> {
    await this.repo.appendInternetCall(call);
  }

  async endChain(chainId: string): Promise<void> {
    const entry = await this.repo.getChain(chainId);
    if (!entry) {
      throw new NotFoundError(`Chain ${chainId} not found`);
    }
    const updated: ChainSummary = { ...entry.chain, chainEndTs: new Date().toISOString() };
    await this.repo.appendChain(updated);
  }
}
