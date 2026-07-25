import type { Device, PatchDevice } from '../schemas/device.ts';

export interface DeviceRepository {
  findAll(): Promise<Device[]>;
  findById(deviceId: string): Promise<Device | undefined>;
  upsert(device: Device): Promise<Device>;
  patch(deviceId: string, updates: PatchDevice): Promise<Device | undefined>;
  setState(deviceId: string, statePatch: Record<string, unknown>): Promise<Device | undefined>;
  remove(deviceId: string): Promise<boolean>;
}

export class InMemoryDeviceRepository implements DeviceRepository {
  private readonly devices = new Map<string, Device>();

  async findAll(): Promise<Device[]> {
    return [...this.devices.values()];
  }

  async findById(deviceId: string): Promise<Device | undefined> {
    return this.devices.get(deviceId);
  }

  async upsert(device: Device): Promise<Device> {
    this.devices.set(device.deviceId, { ...device });
    return { ...device };
  }

  async patch(deviceId: string, updates: PatchDevice): Promise<Device | undefined> {
    const existing = this.devices.get(deviceId);
    if (!existing) return undefined;

    const updated: Device = { ...existing };
    if (updates.displayName !== undefined) updated.displayName = updates.displayName;
    if (updates.room !== undefined) updated.room = updates.room;
    if (updates.tags !== undefined) updated.tags = updates.tags;
    this.devices.set(deviceId, updated);
    return { ...updated };
  }

  async setState(deviceId: string, statePatch: Record<string, unknown>): Promise<Device | undefined> {
    const existing = this.devices.get(deviceId);
    if (!existing) return undefined;

    const updated: Device = {
      ...existing,
      state: { ...existing.state, ...statePatch },
    };
    this.devices.set(deviceId, updated);
    return { ...updated };
  }

  async remove(deviceId: string): Promise<boolean> {
    return this.devices.delete(deviceId);
  }
}
