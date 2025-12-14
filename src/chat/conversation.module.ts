import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConversationMessage } from './conversation-message.entity';

import { ConversationMessageService } from 'src/chat/conversation-message.service';
import { ConversationReadState } from 'src/chat/conversation-read-state.entity';
import { ConversationController } from 'src/chat/conversation.controller';
import { Conversation } from 'src/chat/conversation.entity';
import { ConversationGateway } from './conversation.gateway';
import { ConversationService } from './conversation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      ConversationMessage,
      ConversationReadState,
    ]),
  ],
  controllers: [ConversationController],
  providers: [
    ConversationService,
    ConversationMessageService,
    ConversationGateway,
  ],
  exports: [ConversationService, ConversationMessageService],
})
export class ConversationModule {}
