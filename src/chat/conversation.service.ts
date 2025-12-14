import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ConversationMessage } from './conversation-message.entity';
import { ConversationReadState } from './conversation-read-state.entity';
import { Conversation } from './conversation.entity';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,

    @InjectRepository(ConversationMessage)
    private readonly msgRepo: Repository<ConversationMessage>,

    @InjectRepository(ConversationReadState)
    private readonly readStateRepo: Repository<ConversationReadState>,
  ) {}

  async findUserConversations(userId: string) {
    const conversations = await this.convRepo.find({
      where: [{ buyerId: userId }, { sellerId: userId }],
      order: { created_at: 'DESC' },
    });

    if (conversations.length === 0) {
      return [];
    }

    const convIds = conversations.map((c) => c.id);

    const messages = await this.msgRepo.find({
      where: {
        conversation: { id: In(convIds) },
      },
      relations: ['conversation'],
      order: { created_at: 'ASC' },
    });

    const messagesByConv = new Map<string, ConversationMessage[]>();
    for (const m of messages) {
      const convId = m.conversation?.id;
      if (!convId) continue;

      const arr = messagesByConv.get(convId) ?? [];
      arr.push(m);
      messagesByConv.set(convId, arr);
    }

    const readStates = await this.readStateRepo.find({
      where: { userId, conversationId: In(convIds) },
    });

    const readStateByConv = new Map<string, ConversationReadState>();
    for (const rs of readStates) {
      readStateByConv.set(rs.conversationId, rs);
    }

    return conversations.map((conv) => {
      const convMessages = messagesByConv.get(conv.id) ?? [];

      const lastMsg = convMessages[convMessages.length - 1];

      const lastReceivedMsg = [...convMessages]
        .filter((m) => m.senderId !== userId)
        .at(-1);

      const readState = readStateByConv.get(conv.id);

      const lastMessageAt = lastMsg?.created_at ?? conv.created_at;

      const hasUnread =
        !!lastReceivedMsg &&
        (!readState || lastReceivedMsg.created_at > readState.lastReadAt);

      return {
        ...conv,
        hasUnread,
        lastMessageAt,
      };
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

  /**
   * Marque une conversation comme lue pour un utilisateur
   */
  async markConversationAsRead(conversationId: string, userId: string) {
    const now = new Date();

    const existing = await this.readStateRepo.findOne({
      where: {
        conversationId,
        userId,
      },
    });

    if (existing) {
      existing.lastReadAt = now;
      await this.readStateRepo.save(existing);
      return existing;
    }

    const readState = this.readStateRepo.create({
      conversationId,
      userId,
      lastReadAt: now,
    });

    await this.readStateRepo.save(readState);
    return readState;
  }

  /**
   * Marque une conversation comme NON lue pour un utilisateur
   * → on supprime l'état de lecture, comme si l'utilisateur n'avait jamais ouvert la conv.
   */
  async markConversationAsUnread(conversationId: string, userId: string) {
    await this.readStateRepo.delete({ conversationId, userId });
  }
}
