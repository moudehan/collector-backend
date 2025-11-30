import { Entity, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Article } from './article.entity';
import { User } from 'src/users/user.entity';

@Entity('article_likes')
export class ArticleLike {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Article)
  article: Article;
}
