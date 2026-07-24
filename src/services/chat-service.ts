import { randomUUID } from 'node:crypto';
import type { ConfigRepository } from '../repositories/config-repo.ts';
import type { ChatMessage, ChatResponse } from '../schemas/chat.ts';

export class ChatService {
  private readonly configRepo: ConfigRepository;

  constructor(configRepo: ConfigRepository) {
    this.configRepo = configRepo;
  }

  async send(message: ChatMessage): Promise<ChatResponse> {
    const config = await this.configRepo.get();
    return {
      chainId: randomUUID(),
      reply: `I heard: "${message.text}" — chat processing is not yet implemented.`,
      usedInternet: false,
      privacyMode: config.defaultPrivacyMode,
      actions: [],
    };
  }
}
