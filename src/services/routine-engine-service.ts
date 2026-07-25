import { randomUUID } from 'node:crypto';
import { InvalidInputError } from '../errors.ts';
import type { LogEntry } from '../schemas/log.ts';
import type { Routine, RoutineAction } from '../schemas/routine.ts';
import type { DeviceService } from './device-service.ts';
import type { LogService } from './log-service.ts';
import type { RoutineService } from './routine-service.ts';

/** Cap delays in the engine so unit tests stay fast. */
const MAX_DELAY_MS = 100;

export interface ConditionContext {
  now: Date;
  deviceStates: Map<string, Record<string, unknown>>;
  presence?: boolean;
}

export interface RoutineActionResult {
  actionIndex: number;
  result: 'success' | 'failure';
  errorMessage?: string;
}

export interface RoutineExecutionResult {
  chainId: string;
  results: RoutineActionResult[];
}

export interface ExecuteRoutineOptions {
  profileId?: string | undefined;
  deviceId?: string | undefined;
}

export class RoutineEngineService {
  private readonly routines: RoutineService;
  private readonly devices: DeviceService;
  private readonly logs: LogService;

  constructor(routines: RoutineService, devices: DeviceService, logs: LogService) {
    this.routines = routines;
    this.devices = devices;
    this.logs = logs;
  }

  conditionsMet(routine: Routine, ctx: ConditionContext): boolean {
    for (const condition of routine.conditions) {
      if (!this.evaluateCondition(condition.type, condition.config, ctx)) {
        return false;
      }
    }
    return true;
  }

  async execute(routineId: string, opts: ExecuteRoutineOptions = {}): Promise<RoutineExecutionResult> {
    const routine = await this.routines.get(routineId);
    if (!routine.enabled) {
      throw new InvalidInputError(`Routine ${routineId} is disabled`);
    }

    const chainId = randomUUID();
    const deviceId = opts.deviceId ?? 'cube';
    const profileId = opts.profileId ?? routine.ownerProfileId;

    await this.logs.startChain(chainId, deviceId, profileId);
    await this.logs.recordIntent({
      chainId,
      intentIndex: 0,
      ts: new Date().toISOString(),
      utterance: `Run routine ${routine.name}`,
      type: 'routine_run',
      targets: routine.actions
        .map((a) => (typeof a.config.deviceId === 'string' ? a.config.deviceId : null))
        .filter((id): id is string => id !== null),
      parameters: { routineId },
      profileId,
    });

    const results: RoutineActionResult[] = [];

    for (let actionIndex = 0; actionIndex < routine.actions.length; actionIndex++) {
      const action = routine.actions[actionIndex];
      if (!action) continue;

      const outcome = await this.runAction(action, chainId, actionIndex);
      results.push(outcome);
    }

    await this.logs.endChain(chainId);
    return { chainId, results };
  }

  async history(routineId: string, limit = 20): Promise<LogEntry[]> {
    const entries = await this.logs.query({ limit: 200, offset: 0 });
    const matched = entries.filter((entry) =>
      entry.intents.some((intent) => intent.type === 'routine_run' && intent.parameters.routineId === routineId)
    );
    return matched.slice(0, limit);
  }

  private evaluateCondition(type: string, config: Record<string, unknown>, ctx: ConditionContext): boolean {
    if (type === 'time_window') {
      const startHour = Number(config.startHour ?? 0);
      const endHour = Number(config.endHour ?? 24);
      const hour = ctx.now.getUTCHours();
      if (startHour <= endHour) {
        return hour >= startHour && hour < endHour;
      }
      return hour >= startHour || hour < endHour;
    }

    if (type === 'device_state') {
      const deviceId = String(config.deviceId ?? '');
      const key = String(config.key ?? '');
      const expected = config.equals;
      const state = ctx.deviceStates.get(deviceId);
      if (!state) return false;
      return state[key] === expected;
    }

    if (type === 'presence') {
      const expected = Boolean(config.present);
      return (ctx.presence ?? false) === expected;
    }

    return false;
  }

  private async runAction(action: RoutineAction, chainId: string, actionIndex: number): Promise<RoutineActionResult> {
    const ts = new Date().toISOString();

    if (action.type === 'delay') {
      const requested = Number(action.config.ms ?? 0);
      const ms = Math.min(Math.max(0, Number.isFinite(requested) ? requested : 0), MAX_DELAY_MS);
      if (ms > 0) {
        await new Promise((resolve) => setTimeout(resolve, ms));
      }
      await this.logs.recordAction({
        chainId,
        actionIndex,
        intentIndex: 0,
        ts,
        deviceId: 'delay',
        beforeState: {},
        afterState: { ms },
        result: 'success',
        errorMessage: null,
      });
      return { actionIndex, result: 'success' };
    }

    if (action.type === 'notification') {
      await this.logs.recordAction({
        chainId,
        actionIndex,
        intentIndex: 0,
        ts,
        deviceId: 'notification',
        beforeState: {},
        afterState: { message: action.config.message ?? null },
        result: 'success',
        errorMessage: null,
      });
      return { actionIndex, result: 'success' };
    }

    const deviceId = String(action.config.deviceId ?? '');
    if (!deviceId) {
      const errorMessage = 'device_state action missing deviceId';
      await this.logs.recordAction({
        chainId,
        actionIndex,
        intentIndex: 0,
        ts,
        deviceId: 'unknown',
        beforeState: {},
        afterState: {},
        result: 'failure',
        errorMessage,
      });
      return { actionIndex, result: 'failure', errorMessage };
    }

    let beforeState: Record<string, unknown> = {};
    try {
      const existing = await this.devices.get(deviceId);
      beforeState = { ...existing.state };
    } catch {
      // recorded below on apply failure
    }

    const { deviceId: _id, state: nested, ...rest } = action.config;
    void _id;
    const statePatch =
      nested && typeof nested === 'object' && !Array.isArray(nested) ? (nested as Record<string, unknown>) : rest;

    try {
      const updated = await this.devices.applyState(deviceId, statePatch);
      await this.logs.recordAction({
        chainId,
        actionIndex,
        intentIndex: 0,
        ts,
        deviceId,
        beforeState,
        afterState: { ...updated.state },
        result: 'success',
        errorMessage: null,
      });
      return { actionIndex, result: 'success' };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'device_state failed';
      await this.logs.recordAction({
        chainId,
        actionIndex,
        intentIndex: 0,
        ts,
        deviceId,
        beforeState,
        afterState: beforeState,
        result: 'failure',
        errorMessage,
      });
      return { actionIndex, result: 'failure', errorMessage };
    }
  }
}
