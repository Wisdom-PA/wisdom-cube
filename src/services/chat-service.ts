import { randomUUID } from 'node:crypto';
import type { ChatMessage, ChatResponse } from '../schemas/chat.ts';
import type { CloudLlmClient } from './cloud-llm-client.ts';
import type { InternetPermissionService } from './internet-permission-service.ts';
import type { LogService } from './log-service.ts';
import type { PrivacyService } from './privacy-service.ts';
import type { ProfileService } from './profile-service.ts';

const COMPANION_DEVICE_ID = 'companion';
const ONLINE_QUERY_RE = /\b(weather|news|online|search)\b/i;
const OFFLINE_DENIAL =
  'Online access is turned off for this device. You can turn it on in the app if you want to use the internet.';
const ONLINE_BLOCKED = "I couldn't reach the online service right now, there are more details in the app";

export class ChatService {
  private readonly logService: LogService;
  private readonly privacyService: PrivacyService;
  private readonly profileService: ProfileService;
  private readonly internetPermission: InternetPermissionService;
  private readonly cloudLlm: CloudLlmClient;

  constructor(
    logService: LogService,
    privacyService: PrivacyService,
    profileService: ProfileService,
    internetPermission: InternetPermissionService,
    cloudLlm: CloudLlmClient
  ) {
    this.logService = logService;
    this.privacyService = privacyService;
    this.profileService = profileService;
    this.internetPermission = internetPermission;
    this.cloudLlm = cloudLlm;
  }

  async send(message: ChatMessage): Promise<ChatResponse> {
    const chainId = randomUUID();
    const profileId = message.profileId;

    await this.logService.startChain(chainId, COMPANION_DEVICE_ID, profileId);
    const privacy = await this.privacyService.startChainPrivacy(chainId);

    await this.logService.recordIntent({
      chainId,
      intentIndex: 0,
      ts: new Date().toISOString(),
      utterance: message.text,
      type: 'chat',
      targets: [],
      parameters: {},
      profileId,
    });

    const needsInternet = message.allowInternet === true || ONLINE_QUERY_RE.test(message.text);
    let reply: string;
    let usedInternet = false;
    let privacyMode = privacy.mode;

    if (needsInternet) {
      const decision = await this.internetPermission.evaluate({
        profileId,
        allowInternet: message.allowInternet,
        chainPrivacyMode: privacy.mode,
      });

      if (!decision.allowed) {
        reply = decision.reason === 'offline_mode' ? OFFLINE_DENIAL : ONLINE_BLOCKED;
        await this.logService.recordInternetCall({
          chainId,
          callIndex: 0,
          ts: new Date().toISOString(),
          deviceId: COMPANION_DEVICE_ID,
          profileId,
          summary: 'Chat online request',
          serviceCategory: 'cloud_llm',
          endpoint: 'mock://cloud-llm',
          result: 'blocked',
          errorMessage: decision.reason,
        });
      } else {
        if (privacy.mode === 'paranoid' && profileId) {
          const isAdult = await this.profileService.isAdult(profileId);
          if (isAdult) {
            await this.privacyService.grantInternetAccess(chainId, profileId);
          }
        }

        const result = await this.cloudLlm.complete({ prompt: message.text, chainId });
        await this.logService.recordInternetCall({
          chainId,
          callIndex: 0,
          ts: new Date().toISOString(),
          deviceId: COMPANION_DEVICE_ID,
          profileId,
          summary: 'Chat online request',
          serviceCategory: 'cloud_llm',
          endpoint: result.endpoint,
          result: 'allowed',
          errorMessage: null,
        });
        reply = result.reply;
        usedInternet = true;
        const updatedPrivacy = this.privacyService.getChainPrivacy(chainId);
        if (updatedPrivacy) {
          privacyMode = updatedPrivacy.mode;
        }
      }
    } else {
      reply = `I heard: "${message.text}" — chat processing is not yet implemented.`;
    }

    await this.logService.endChain(chainId);
    this.privacyService.endChainPrivacy(chainId);

    return {
      chainId,
      reply,
      usedInternet,
      privacyMode,
      actions: [],
    };
  }
}
