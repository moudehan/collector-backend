import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Article } from './article.entity';

@Entity('article_images')
export class ArticleImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  url: string;

  @ManyToOne(() => Article, (article) => article.images, {
    onDelete: 'CASCADE',
  })
  article: Article;
}
