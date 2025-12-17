import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { KeycloakAuthGuard } from 'src/auth/keycloak-auth.guard';
import { ArticleRatingsService } from './article-ratings.service';
import { RateArticleDto } from './dto/rate-article.dto';

interface AuthRequest extends Request {
  user: { sub: string };
}

@Controller('article-ratings')
@UseGuards(KeycloakAuthGuard)
export class ArticleRatingsController {
  constructor(private readonly ratingsService: ArticleRatingsService) {}

  @Post(':articleId')
  async rateArticle(
    @Param('articleId') articleId: string,
    @Body() dto: RateArticleDto,
    @Req() req: AuthRequest,
  ) {
    const userId = req.user.sub;
    return this.ratingsService.rateArticle(userId, articleId, dto.value);
  }

  @Get(':articleId')
  async getRating(@Param('articleId') articleId: string) {
    return this.ratingsService.getArticleRating(articleId);
  }
}
