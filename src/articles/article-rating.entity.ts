import { Article } from 'src/articles/article.entity';
import { User } from 'src/users/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('article_ratings')
@Unique(['user', 'article'])
export class ArticleRating {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  value: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  user: User;

  @ManyToOne(() => Article, (article) => article.ratings, {
    onDelete: 'CASCADE',
    eager: false,
  })
  article: Article;

  @CreateDateColumn()
  created_at: Date;
}
