import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import { ChatService } from './chat.service';
import type { SendMessageDto } from './dto/send-message.dto';

@WebSocketGateway({ cors: true })
export class ChatGateway {
  constructor(private chat: ChatService) {}

  @SubscribeMessage('send_message')
  async send(
    @MessageBody() data: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    const { sender, receiver, articleId, content } = data;

    const msg = await this.chat.sendMessage(
      sender,
      receiver,
      articleId,
      content,
    );

    client.broadcast.emit(`chat_${receiver}`, msg);
    client.emit(`chat_${sender}`, msg);

    return msg;
  }
}
