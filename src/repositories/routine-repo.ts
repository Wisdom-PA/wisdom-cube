import { randomUUID } from 'node:crypto';
import type { CreateRoutine, Routine } from '../schemas/routine.ts';

export interface RoutineRepository {
  findAll(): Promise<Routine[]>;
  findById(routineId: string): Promise<Routine | undefined>;
  insert(input: CreateRoutine): Promise<Routine>;
  remove(routineId: string): Promise<boolean>;
}

export class InMemoryRoutineRepository implements RoutineRepository {
  private readonly routines = new Map<string, Routine>();

  async findAll(): Promise<Routine[]> {
    return [...this.routines.values()];
  }

  async findById(routineId: string): Promise<Routine | undefined> {
    return this.routines.get(routineId);
  }

  async insert(input: CreateRoutine): Promise<Routine> {
    const now = new Date().toISOString();
    const routine: Routine = {
      routineId: randomUUID(),
      name: input.name,
      ownerProfileId: input.ownerProfileId,
      enabled: input.enabled,
      triggers: input.triggers,
      conditions: input.conditions,
      actions: input.actions,
      createdAt: now,
      updatedAt: now,
    };
    this.routines.set(routine.routineId, routine);
    return { ...routine };
  }

  async remove(routineId: string): Promise<boolean> {
    return this.routines.delete(routineId);
  }
}
