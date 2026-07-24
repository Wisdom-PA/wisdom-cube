import { NotFoundError } from '../errors.ts';
import type { LogRepository } from '../repositories/log-repo.ts';
import type { LogEntry, LogQuery } from '../schemas/log.ts';

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
}
