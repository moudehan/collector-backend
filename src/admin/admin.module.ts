import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminController } from './admin.controller';
import { User } from 'src/users/user.entity';
import { Article } from 'src/articles/article.entity';
import { FraudAlert } from 'src/fraud/fraud-alert.entity';
import { ChatMessage } from 'src/chat/chat-message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Article, FraudAlert, ChatMessage])],
  controllers: [AdminController],
})
export class AdminModule {}
