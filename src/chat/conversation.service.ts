import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './conversation.entity';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
  ) {}

  findUserConversations(userId: string) {
    return this.convRepo.find({
      where: [{ buyerId: userId }, { sellerId: userId }],
      order: { created_at: 'DESC' },
    });
  }

  async findConversation(
    articleId: string,
    shopId: string,
    buyerId: string,
    sellerId: string,
  ): Promise<Conversation | null> {
    return this.convRepo.findOne({
      where: {
        articleId,
        shopId,
        buyerId,
        sellerId,
      },
    });
  }

  async findById(conversationId: string) {
    return this.convRepo.findOne({
      where: { id: conversationId },
    });
  }
}
