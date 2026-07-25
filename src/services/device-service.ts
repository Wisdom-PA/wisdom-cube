import { InvalidInputError, NotFoundError } from '../errors.ts';
import type { DeviceRepository } from '../repositories/device-repo.ts';
import type { Device, DeviceCapability, PatchDevice } from '../schemas/device.ts';

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

  async applyState(deviceId: string, state: Record<string, unknown>): Promise<Device> {
    const device = await this.get(deviceId);
    if (!device.reachable) {
      throw new InvalidInputError(`Device ${device.displayName} is unreachable`);
    }
    const updated = await this.repo.setState(deviceId, state);
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

  async listByRoom(room: string): Promise<Device[]> {
    const all = await this.repo.findAll();
    return all.filter((d) => d.room === room);
  }

  async listByCapability(capability: DeviceCapability): Promise<Device[]> {
    const all = await this.repo.findAll();
    return all.filter((d) => d.capabilities.includes(capability));
  }

  async listReachable(): Promise<Device[]> {
    const all = await this.repo.findAll();
    return all.filter((d) => d.reachable);
  }

  async requireCapability(deviceId: string, capability: DeviceCapability): Promise<Device> {
    const device = await this.get(deviceId);
    if (!device.capabilities.includes(capability)) {
      throw new InvalidInputError(`Device ${device.displayName} does not support ${capability}`);
    }
    return device;
  }
}
