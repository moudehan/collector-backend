import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesModule } from 'src/categories/categories.module';
import { AdminModule } from './admin/admin.module';
import { Article } from './articles/article.entity';
import { ArticlesModule } from './articles/articles.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { FraudModule } from './fraud/fraud.module';
import { NotificationsModule } from './notifications/notifications.module';
import { Shop } from './shops/shop.entity';
import { ShopsModule } from './shops/shops.module';
import { User } from './users/user.entity';
import { UsersModule } from './users/users.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      logging: ['query', 'error'],

      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      entities: [User, Shop, Article],
      synchronize: true,
    }),
    UsersModule,
    AuthModule,
    ShopsModule,
    ArticlesModule,
    NotificationsModule,
    FraudModule,
    ChatModule,
    AdminModule,
    CategoriesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
