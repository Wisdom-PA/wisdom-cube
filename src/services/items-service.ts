import { ConflictError, InvalidInputError, NotFoundError } from '../errors.ts';
import type { Item, ItemsRepository } from '../repositories/items-repo.ts';

// Business logic lives here — framework-agnostic and unit-testable without HTTP.
export class ItemsService {
  private readonly repo: ItemsRepository;

  constructor(repo: ItemsRepository) {
    this.repo = repo;
  }

  async list(): Promise<Item[]> {
    return this.repo.findAll();
  }

  async get(id: string): Promise<Item> {
    const item = await this.repo.findById(id);
    if (!item) {
      throw new NotFoundError(`Item ${id} not found`);
    }
    return item;
  }

  async create(input: { name: string }): Promise<Item> {
    const name = input.name.trim();
    if (name.length === 0) {
      throw new InvalidInputError('Item name must not be blank');
    }
    if (await this.repo.existsByName(name)) {
      throw new ConflictError(`Item named "${name}" already exists`);
    }
    return this.repo.insert({ name });
  }
}
