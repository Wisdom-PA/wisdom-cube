import { describe, expect, it } from 'vitest';
import { InMemoryDeviceRepository } from '../src/repositories/device-repo.ts';
import { InMemoryLogRepository } from '../src/repositories/log-repo.ts';
import { InMemoryRoutineRepository } from '../src/repositories/routine-repo.ts';
import type { Routine } from '../src/schemas/routine.ts';
import { DeviceService } from '../src/services/device-service.ts';
import { LogService } from '../src/services/log-service.ts';
import { RoutineEngineService } from '../src/services/routine-engine-service.ts';
import { RoutineService } from '../src/services/routine-service.ts';

describe('RoutineEngineService', () => {
  async function makeEngine() {
    const deviceRepo = new InMemoryDeviceRepository();
    const routineRepo = new InMemoryRoutineRepository();
    const logRepo = new InMemoryLogRepository();
    const devices = new DeviceService(deviceRepo);
    const routines = new RoutineService(routineRepo);
    const logs = new LogService(logRepo);

    await deviceRepo.upsert({
      deviceId: 'light-1',
      displayName: 'Lamp',
      room: 'Living Room',
      tags: [],
      capabilities: ['on_off'],
      reachable: true,
      state: { on: false },
    });
    await deviceRepo.upsert({
      deviceId: 'plug-1',
      displayName: 'Plug',
      room: 'Office',
      tags: [],
      capabilities: ['on_off'],
      reachable: false,
      state: { on: false },
    });

    const engine = new RoutineEngineService(routines, devices, logs);
    return { engine, devices, routines, logs, deviceRepo };
  }

  it('evaluates time_window, device_state, and presence conditions', async () => {
    const { engine, routines } = await makeEngine();
    const routine = await routines.create({
      name: 'Evening',
      ownerProfileId: 'p1',
      enabled: true,
      triggers: [{ type: 'time', config: { hour: 20 } }],
      conditions: [
        { type: 'time_window', config: { startHour: 18, endHour: 23 } },
        { type: 'device_state', config: { deviceId: 'light-1', key: 'on', equals: false } },
        { type: 'presence', config: { present: true } },
      ],
      actions: [{ type: 'notification', config: { message: 'hi' } }],
    });

    const met = engine.conditionsMet(routine, {
      now: new Date('2026-07-25T20:00:00.000Z'),
      deviceStates: new Map([['light-1', { on: false }]]),
      presence: true,
    });
    expect(met).toBe(true);

    const missed = engine.conditionsMet(routine, {
      now: new Date('2026-07-25T10:00:00.000Z'),
      deviceStates: new Map([['light-1', { on: false }]]),
      presence: true,
    });
    expect(missed).toBe(false);
  });

  it('executes actions with partial failure continuing remaining steps', async () => {
    const { engine, routines, devices } = await makeEngine();
    const routine = await routines.create({
      name: 'Movie',
      ownerProfileId: 'p1',
      enabled: true,
      triggers: [{ type: 'voice_phrase', config: { phrase: 'movie' } }],
      conditions: [],
      actions: [
        { type: 'device_state', config: { deviceId: 'light-1', on: true } },
        { type: 'device_state', config: { deviceId: 'plug-1', on: true } },
        { type: 'notification', config: { message: 'done' } },
        { type: 'delay', config: { ms: 0 } },
      ],
    });

    const result = await engine.execute(routine.routineId);
    expect(result.results).toHaveLength(4);
    expect(result.results[0]?.result).toBe('success');
    expect(result.results[1]?.result).toBe('failure');
    expect(result.results[1]?.errorMessage).toMatch(/unreachable/i);
    expect(result.results[2]?.result).toBe('success');
    expect(result.results[3]?.result).toBe('success');

    const light = await devices.get('light-1');
    expect(light.state.on).toBe(true);

    const history = await engine.history(routine.routineId, 10);
    expect(history).toHaveLength(1);
    expect(history[0]?.intents[0]?.parameters.routineId).toBe(routine.routineId);
    expect(history[0]?.actions).toHaveLength(4);
  });

  it('rejects disabled routines', async () => {
    const { engine, routines } = await makeEngine();
    const created = await routines.create({
      name: 'Off',
      ownerProfileId: 'p1',
      enabled: false,
      triggers: [{ type: 'time', config: {} }],
      conditions: [],
      actions: [{ type: 'notification', config: {} }],
    });

    await expect(engine.execute(created.routineId)).rejects.toThrow(/disabled/i);
  });

  it('treats empty conditions as met', () => {
    const engine = new RoutineEngineService({} as RoutineService, {} as DeviceService, {} as LogService);
    const routine = {
      conditions: [],
    } as unknown as Routine;
    expect(engine.conditionsMet(routine, { now: new Date(), deviceStates: new Map() })).toBe(true);
  });

  it('covers midnight-wrapping time windows and missing device state', async () => {
    const { engine, routines } = await makeEngine();
    const routine = await routines.create({
      name: 'Night',
      ownerProfileId: 'p1',
      enabled: true,
      triggers: [{ type: 'time', config: {} }],
      conditions: [
        { type: 'time_window', config: { startHour: 22, endHour: 6 } },
        { type: 'device_state', config: { deviceId: 'missing', key: 'on', equals: true } },
      ],
      actions: [{ type: 'notification', config: {} }],
    });

    expect(
      engine.conditionsMet(routine, {
        now: new Date('2026-07-25T23:00:00.000Z'),
        deviceStates: new Map(),
        presence: false,
      })
    ).toBe(false);

    expect(
      engine.conditionsMet(
        { ...routine, conditions: [{ type: 'time_window', config: { startHour: 22, endHour: 6 } }] },
        {
          now: new Date('2026-07-25T23:00:00.000Z'),
          deviceStates: new Map(),
        }
      )
    ).toBe(true);

    expect(
      engine.conditionsMet(
        { ...routine, conditions: [{ type: 'time_window', config: { startHour: 22, endHour: 6 } }] },
        {
          now: new Date('2026-07-25T12:00:00.000Z'),
          deviceStates: new Map(),
        }
      )
    ).toBe(false);

    expect(
      engine.conditionsMet(
        { ...routine, conditions: [{ type: 'unknown' as 'presence', config: {} }] },
        { now: new Date(), deviceStates: new Map() }
      )
    ).toBe(false);
  });

  it('handles missing deviceId, nested state, delay wait, and unknown device get', async () => {
    const { engine, routines } = await makeEngine();
    const routine = await routines.create({
      name: 'Edge',
      ownerProfileId: 'p1',
      enabled: true,
      triggers: [{ type: 'time', config: {} }],
      conditions: [],
      actions: [
        { type: 'device_state', config: { on: true } },
        { type: 'device_state', config: { deviceId: 'light-1', state: { on: false, brightness: 0.2 } } },
        { type: 'device_state', config: { deviceId: 'ghost', on: true } },
        { type: 'delay', config: { ms: 5 } },
        { type: 'delay', config: { ms: Number.NaN } },
        { type: 'delay', config: { ms: 500 } },
        { type: 'notification', config: {} },
      ],
    });

    const result = await engine.execute(routine.routineId, { profileId: 'p1', deviceId: 'cube' });
    expect(result.results[0]?.result).toBe('failure');
    expect(result.results[1]?.result).toBe('success');
    expect(result.results[2]?.result).toBe('failure');
    expect(result.results[3]?.result).toBe('success');
    expect(result.results[4]?.result).toBe('success');
    expect(result.results[5]?.result).toBe('success');
    expect(result.results[6]?.result).toBe('success');
  });

  it('evaluates presence when ctx.presence is omitted', async () => {
    const { engine, routines } = await makeEngine();
    const routine = await routines.create({
      name: 'Away',
      ownerProfileId: 'p1',
      enabled: true,
      triggers: [{ type: 'presence', config: {} }],
      conditions: [{ type: 'presence', config: { present: false } }],
      actions: [{ type: 'notification', config: { message: 'ok' } }],
    });
    expect(engine.conditionsMet(routine, { now: new Date(), deviceStates: new Map() })).toBe(true);
  });
});
