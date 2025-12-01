import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  create(dto: CreateCategoryDto) {
    const category = this.categoryRepo.create(dto);
    return this.categoryRepo.save(category);
  }

  findAll() {
    return this.categoryRepo.find();
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');

    Object.assign(category, dto);
    return this.categoryRepo.save(category);
  }

  async delete(id: string) {
    const used = await this.categoryRepo
      .createQueryBuilder('category')
      .leftJoin('category.articles', 'articles')
      .where('category.id = :id', { id })
      .andWhere('articles.id IS NOT NULL')
      .getOne();

    if (used) {
      throw new BadRequestException(
        'Impossible de supprimer cette catégorie car elle est liée à des articles.',
      );
    }

    return this.categoryRepo.delete(id);
  }
}
