import { Repository, ObjectLiteral } from 'typeorm';

export function createMockRepository<
  T extends ObjectLiteral = ObjectLiteral,
>(): Partial<Repository<T>> {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}
