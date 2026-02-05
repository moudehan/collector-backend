import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMockRepository } from '../../test/utils/mock-repository';
import { CategoriesService } from './categories.service';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

describe('CategoriesService', () => {
  let service: CategoriesService;
  const repo = createMockRepository<Category>();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getRepositoryToken(Category), useValue: repo },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create should persist a new category', async () => {
    const dto: CreateCategoryDto = { name: 'New Cat' };
    (repo.create as jest.Mock).mockReturnValueOnce(dto);
    (repo.save as jest.Mock).mockResolvedValueOnce({ id: 'c1', ...dto });

    const res = await service.create(dto);
    expect(repo.create).toHaveBeenCalledWith(dto);
    expect(repo.save).toHaveBeenCalled();
    expect(res).toMatchObject({ id: 'c1', name: 'New Cat' });
  });

  it('findAll should return categories', async () => {
    (repo.find as jest.Mock).mockResolvedValueOnce([{ id: 'c1' }]);
    const res = await service.findAll();
    expect(res).toEqual([{ id: 'c1' }]);
  });

  it('update should throw when not found', async () => {
    (repo.findOne as jest.Mock).mockResolvedValueOnce(null);
    await expect(
      service.update('c1', { name: 'x' } as UpdateCategoryDto),
    ).rejects.toThrow('Category not found');
  });

  it('update should merge and save when found', async () => {
    const existing: Partial<Category> = { id: 'c1', name: 'old' };
    (repo.findOne as jest.Mock).mockResolvedValueOnce(existing);
    (repo.save as jest.Mock).mockResolvedValueOnce({ id: 'c1', name: 'new' });

    const res = await service.update('c1', {
      name: 'new',
    } as UpdateCategoryDto);
    expect(repo.save).toHaveBeenCalled();
    expect(res).toMatchObject({ id: 'c1', name: 'new' });
  });

  it('delete should throw when category is used by articles', async () => {
    const qb: any = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id: 'c1' }),
    };
    (repo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

    await expect(service.delete('c1')).rejects.toThrow(
      'Impossible de supprimer cette catégorie',
    );
  });

  it('delete should call delete when not used', async () => {
    const qb: any = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    (repo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
    (repo.delete as jest.Mock).mockResolvedValueOnce({});

    const res = await service.delete('c1');
    expect(repo.delete).toHaveBeenCalledWith('c1');
    expect(res).toBeDefined();
  });
});
