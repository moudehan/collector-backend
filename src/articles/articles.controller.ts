import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { CurrentUser } from 'src/auth/user.decorator';
import type { JwtUser } from 'src/auth/user.type';
import { UserRole } from 'src/users/user.entity';

import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';

import { FilesInterceptor } from '@nestjs/platform-express';
import type { File as MulterFile } from 'multer';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('articles')
export class ArticlesController {
  constructor(private service: ArticlesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      storage: diskStorage({
        destination: './uploads/articles',
        filename: (
          req,
          file: MulterFile,
          cb: (error: Error | null, filename: string) => void,
        ) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  create(
    @Body() dto: CreateArticleDto,
    @UploadedFiles() images: MulterFile[],
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.create(dto, images, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.findOneById(id);
  }

  @Delete(':id')
  async deleteArticle(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  myArticles(@CurrentUser() user: JwtUser) {
    return this.service.findMine(user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.service.approve(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.service.reject(id);
  }

  @Get()
  publicCatalogue(@Query('categoryId') categoryId?: string) {
    return this.service.publicCatalogue(categoryId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/follow')
  follow(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.follow(id, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/follow')
  unfollow(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.unfollow(id, user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/price/:newPrice')
  updatePrice(@Param('id') id: string, @Param('newPrice') newPrice: string) {
    return this.service.updatePrice(id, Number(newPrice));
  }

  @Get('recommendations')
  @UseGuards(JwtAuthGuard)
  getRecommendations(@CurrentUser() user: JwtUser) {
    return this.service.getRecommendations(user.userId, user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Get('following')
  getFollowing(@CurrentUser() user: JwtUser) {
    return this.service.getFollowing(user.userId);
  }
}
