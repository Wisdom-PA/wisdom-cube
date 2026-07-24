import { randomUUID } from 'node:crypto';

export interface Item {
  id: string;
  name: string;
  createdAt: string;
}

export interface NewItem {
  name: string;
}

// The contract the service layer depends on — the only layer that touches
// persistence. Swap the in-memory impl for a real store without touching services.
export interface ItemsRepository {
  findAll(): Promise<Item[]>;
  findById(id: string): Promise<Item | undefined>;
  existsByName(name: string): Promise<boolean>;
  insert(item: NewItem): Promise<Item>;
}

// DEMO STORE — grows unbounded (no eviction) and scans linearly on name checks.
// Fine for the scaffold's sample resource; replace with a real datastore before
// shipping anything that accepts writes in production.
export class InMemoryItemsRepository implements ItemsRepository {
  private readonly items = new Map<string, Item>();

  async findAll(): Promise<Item[]> {
    return [...this.items.values()];
  }

  async findById(id: string): Promise<Item | undefined> {
    return this.items.get(id);
  }

  async existsByName(name: string): Promise<boolean> {
    return [...this.items.values()].some((item) => item.name === name);
  }

  async insert(newItem: NewItem): Promise<Item> {
    const item: Item = {
      id: randomUUID(),
      name: newItem.name,
      createdAt: new Date().toISOString(),
    };
    this.items.set(item.id, item);
    return item;
  }
}
