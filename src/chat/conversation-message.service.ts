import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConversationGateway } from 'src/chat/conversation.gateway';
import { Repository } from 'typeorm';
import { ConversationMessage } from './conversation-message.entity';
import { Conversation } from './conversation.entity';

@Injectable()
export class ConversationMessageService {
  constructor(
    @InjectRepository(ConversationMessage)
    private readonly msgRepo: Repository<ConversationMessage>,

    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,

    private readonly conversationGateway: ConversationGateway,
  ) {}

  async sendFirstMessage(
    articleId: string,
    shopId: string,
    buyerId: string,
    sellerId: string,
    content: string,
  ) {
    let conversation = await this.convRepo.findOne({
      where: { articleId, shopId, buyerId, sellerId },
    });

    if (!conversation) {
      conversation = this.convRepo.create({
        articleId,
        shopId,
        buyerId,
        sellerId,
      });

      await this.convRepo.save(conversation);
    }

    const message = this.msgRepo.create({
      conversation,
      senderId: buyerId,
      content,
    });

    const saved = await this.msgRepo.save(message);

    this.conversationGateway.emitNewMessage(conversation.id, saved);

    return {
      ...saved,
      conversation,
    };
  }

  async sendMessageToConversation(
    conversationId: string,
    senderId: string,
    content: string,
  ) {
    const conversation = await this.convRepo.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new Error('Conversation introuvable');
    }

    const message = this.msgRepo.create({
      conversation,
      senderId,
      content,
    });

    const saved = await this.msgRepo.save(message);

    this.conversationGateway.emitNewMessage(conversation.id, saved);

    return saved;
  }

  async getMessages(conversationId: string) {
    return this.msgRepo.find({
      where: { conversation: { id: conversationId } },
      order: { created_at: 'ASC' },
    });
  }
}
