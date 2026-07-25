import { NotFoundError } from '../errors.ts';
import type { DeviceRepository } from '../repositories/device-repo.ts';
import type { Device, PatchDevice } from '../schemas/device.ts';

export class DeviceService {
  private readonly repo: DeviceRepository;

  constructor(repo: DeviceRepository) {
    this.repo = repo;
  }

  async list(): Promise<Device[]> {
    return this.repo.findAll();
  }

  async get(deviceId: string): Promise<Device> {
    const device = await this.repo.findById(deviceId);
    if (!device) {
      throw new NotFoundError(`Device ${deviceId} not found`);
    }
    return device;
  }

  async patch(deviceId: string, updates: PatchDevice): Promise<Device> {
    const updated = await this.repo.patch(deviceId, updates);
    if (!updated) {
      throw new NotFoundError(`Device ${deviceId} not found`);
    }
    return updated;
  }

  async remove(deviceId: string): Promise<void> {
    const deleted = await this.repo.remove(deviceId);
    if (!deleted) {
      throw new NotFoundError(`Device ${deviceId} not found`);
    }
  }
}
