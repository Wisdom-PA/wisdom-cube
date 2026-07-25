import { NotFoundError } from '../errors.ts';
import type { RoutineRepository } from '../repositories/routine-repo.ts';
import type { CreateRoutine, Routine } from '../schemas/routine.ts';

export class RoutineService {
  private readonly repo: RoutineRepository;

  constructor(repo: RoutineRepository) {
    this.repo = repo;
  }

  async list(): Promise<Routine[]> {
    return this.repo.findAll();
  }

  async get(routineId: string): Promise<Routine> {
    const routine = await this.repo.findById(routineId);
    if (!routine) {
      throw new NotFoundError(`Routine ${routineId} not found`);
    }
    return routine;
  }

  async create(input: CreateRoutine): Promise<Routine> {
    return this.repo.insert(input);
  }

  async remove(routineId: string): Promise<void> {
    const deleted = await this.repo.remove(routineId);
    if (!deleted) {
      throw new NotFoundError(`Routine ${routineId} not found`);
    }
  }
}
