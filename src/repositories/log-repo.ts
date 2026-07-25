import type { ChainSummary, LogAction, LogEntry, LogIntent, LogInternetCall, LogQuery } from '../schemas/log.ts';

export interface LogRepository {
  appendChain(chain: ChainSummary): Promise<void>;
  appendIntent(intent: LogIntent): Promise<void>;
  appendAction(action: LogAction): Promise<void>;
  appendInternetCall(call: LogInternetCall): Promise<void>;
  query(params: LogQuery): Promise<LogEntry[]>;
  getChain(chainId: string): Promise<LogEntry | undefined>;
  purgeOlderThan(isoCutoff: string): Promise<number>;
  listIntents(): Promise<LogIntent[]>;
  listActions(): Promise<LogAction[]>;
  listInternetCalls(): Promise<LogInternetCall[]>;
}

export class InMemoryLogRepository implements LogRepository {
  private readonly chains = new Map<string, ChainSummary>();
  private readonly intents: LogIntent[] = [];
  private readonly actions: LogAction[] = [];
  private readonly internetCalls: LogInternetCall[] = [];

  async appendChain(chain: ChainSummary): Promise<void> {
    this.chains.set(chain.chainId, { ...chain });
  }

  async appendIntent(intent: LogIntent): Promise<void> {
    this.intents.push({ ...intent });
  }

  async appendAction(action: LogAction): Promise<void> {
    this.actions.push({ ...action });
  }

  async appendInternetCall(call: LogInternetCall): Promise<void> {
    this.internetCalls.push({ ...call });
  }

  async getChain(chainId: string): Promise<LogEntry | undefined> {
    const chain = this.chains.get(chainId);
    if (!chain) return undefined;

    return {
      chain,
      intents: this.intents.filter((i) => i.chainId === chainId),
      actions: this.actions.filter((a) => a.chainId === chainId),
      internetCalls: this.internetCalls.filter((c) => c.chainId === chainId),
    };
  }

  async query(params: LogQuery): Promise<LogEntry[]> {
    let chains = [...this.chains.values()];

    if (params.from) {
      const fromTs = params.from;
      chains = chains.filter((c) => c.chainStartTs >= fromTs);
    }
    if (params.to) {
      const toTs = params.to;
      chains = chains.filter((c) => c.chainStartTs <= toTs);
    }
    if (params.profileId) {
      const pid = params.profileId;
      chains = chains.filter((c) => c.initialProfileId === pid || c.identifiedProfileId === pid);
    }
    if (params.deviceId) {
      const did = params.deviceId;
      chains = chains.filter((c) => c.deviceId === did);
    }

    chains.sort((a, b) => (a.chainStartTs < b.chainStartTs ? 1 : -1));

    const paged = chains.slice(params.offset, params.offset + params.limit);

    return paged.map((chain) => ({
      chain,
      intents: this.intents.filter((i) => i.chainId === chain.chainId),
      actions: this.actions.filter((a) => a.chainId === chain.chainId),
      internetCalls: this.internetCalls.filter((c) => c.chainId === chain.chainId),
    }));
  }

  async purgeOlderThan(isoCutoff: string): Promise<number> {
    const toRemove: string[] = [];
    for (const chain of this.chains.values()) {
      if (chain.chainStartTs < isoCutoff) {
        toRemove.push(chain.chainId);
      }
    }

    for (const chainId of toRemove) {
      this.chains.delete(chainId);
    }

    const removeIds = new Set(toRemove);
    for (let i = this.intents.length - 1; i >= 0; i--) {
      if (removeIds.has(this.intents[i]?.chainId ?? '')) {
        this.intents.splice(i, 1);
      }
    }
    for (let i = this.actions.length - 1; i >= 0; i--) {
      if (removeIds.has(this.actions[i]?.chainId ?? '')) {
        this.actions.splice(i, 1);
      }
    }
    for (let i = this.internetCalls.length - 1; i >= 0; i--) {
      if (removeIds.has(this.internetCalls[i]?.chainId ?? '')) {
        this.internetCalls.splice(i, 1);
      }
    }

    return toRemove.length;
  }

  async listIntents(): Promise<LogIntent[]> {
    return this.intents.map((intent) => ({ ...intent }));
  }

  async listActions(): Promise<LogAction[]> {
    return this.actions.map((action) => ({ ...action }));
  }

  async listInternetCalls(): Promise<LogInternetCall[]> {
    return this.internetCalls.map((call) => ({ ...call }));
  }
}
