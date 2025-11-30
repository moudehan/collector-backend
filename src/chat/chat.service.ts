import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './chat-message.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage) private chatRepo: Repository<ChatMessage>,
  ) {}

  sendMessage(
    senderId: string,
    receiverId: string,
    articleId: string,
    text: string,
  ) {
    return this.chatRepo.save({
      sender: { id: senderId },
      receiver: { id: receiverId },
      article: { id: articleId },
      content: text,
    });
  }

  getConversation(a: string, b: string, articleId: string) {
    return this.chatRepo.find({
      where: [
        { sender: { id: a }, receiver: { id: b }, article: { id: articleId } },
        { sender: { id: b }, receiver: { id: a }, article: { id: articleId } },
      ],
      order: { sent_at: 'ASC' },
    });
  }
}
