import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppGateway } from 'src/app.getway';
import { ArticleRatingsModule } from 'src/articles/article-ratings.module';
import { CartModule } from 'src/cart/cart.module';
import { CategoriesModule } from 'src/categories/categories.module';
import { ConversationReadState } from 'src/chat/conversation-read-state.entity';
import { ConversationModule } from 'src/chat/conversation.module';
import { CheckoutModule } from 'src/checkout/checkout.module';
import { Notification } from 'src/notifications/notification.entity';
import { ShippingAddressModule } from 'src/shipping-adress/shipping-adress.module';
import { ShopRatingsModule } from 'src/shops/shop-ratings.module';
import { AdminModule } from './admin/admin.module';
import { Article } from './articles/article.entity';
import { ArticlesModule } from './articles/articles.module';
import { AuthModule } from './auth/auth.module';
import { FraudModule } from './fraud/fraud.module';
import { NotificationsModule } from './notifications/notifications.module';
import { Shop } from './shops/shop.entity';
import { ShopsModule } from './shops/shops.module';
import { User } from './users/user.entity';
import { UsersModule } from './users/users.module';

import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { HttpLoggerMiddleware } from './common/middleware/http-logger.middleware';

import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/app.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    }),

    PrometheusModule.register({
      path: '/metrics',
      defaultLabels: {
        app: 'collector-backend',
      },
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
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
    Notification,
    UsersModule,
    AuthModule,
    ShopsModule,
    ArticlesModule,
    NotificationsModule,
    FraudModule,
    ConversationModule,
    AdminModule,
    CategoriesModule,
    ArticleRatingsModule,
    ShopRatingsModule,
    ConversationReadState,
    CartModule,
    ShippingAddressModule,
    CheckoutModule,
  ],
  controllers: [],
  providers: [AppGateway],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 👇 applique le middleware de logs HTTP sur toutes les routes
    consumer.apply(HttpLoggerMiddleware).forRoutes('*');
  }
}
