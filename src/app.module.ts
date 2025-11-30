import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ShopsModule } from './shops/shops.module';
import { ArticlesModule } from './articles/articles.module';
import { User } from './users/user.entity';
import { Shop } from './shops/shop.entity';
import { Article } from './articles/article.entity';
import { NotificationsModule } from './notifications/notifications.module';
import { FraudModule } from './fraud/fraud.module';
import { ChatModule } from './chat/chat.module';
import { AdminModule } from './admin/admin.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
