import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesPublicController } from './categories-public.controller';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { Category } from './category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Category])],
  controllers: [CategoriesController, CategoriesPublicController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
