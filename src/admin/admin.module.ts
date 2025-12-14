import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Article } from 'src/articles/article.entity';
import { ConversationMessage } from 'src/chat/conversation-message.entity';
import { FraudAlert } from 'src/fraud/fraud-alert.entity';
import { User } from 'src/users/user.entity';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Article, FraudAlert, ConversationMessage]),
  ],
  controllers: [AdminController],
})
export class AdminModule {}
