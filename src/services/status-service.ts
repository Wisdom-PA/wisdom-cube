import type { ConfigRepository } from '../repositories/config-repo.ts';
import type { DeviceRepository } from '../repositories/device-repo.ts';
import type { ProfileRepository } from '../repositories/profile-repo.ts';
import type { CubeStatus } from '../schemas/status.ts';

export class StatusService {
  private readonly configRepo: ConfigRepository;
  private readonly deviceRepo: DeviceRepository;
  private readonly profileRepo: ProfileRepository;

  constructor(configRepo: ConfigRepository, deviceRepo: DeviceRepository, profileRepo: ProfileRepository) {
    this.configRepo = configRepo;
    this.deviceRepo = deviceRepo;
    this.profileRepo = profileRepo;
  }

  async getStatus(): Promise<CubeStatus> {
    const config = await this.configRepo.get();
    const devices = await this.deviceRepo.findAll();
    const profiles = await this.profileRepo.findAll();

    return {
      cubeId: config.cubeId,
      version: '0.1.0',
      uptimeSeconds: process.uptime(),
      privacyMode: config.defaultPrivacyMode,
      internetConnected: !config.offlineModeEnabled,
      offlineModeEnabled: config.offlineModeEnabled,
      pairedDevicesCount: devices.length,
      profilesCount: profiles.length,
      activeProfileId: null,
    };
  }
}
