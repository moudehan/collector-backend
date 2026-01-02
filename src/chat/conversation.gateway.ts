import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class ConversationGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('joinConversation')
  handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    void client.join(data.conversationId);
  }

  emitNewMessage(
    conversationId: string,
    message: unknown,
    excludeSocketId?: string,
  ) {
    if (excludeSocketId) {
      this.server
        .to(conversationId)
        .except(excludeSocketId)
        .emit('newMessage', message);
      return;
    }
    this.server.to(conversationId).emit('newMessage', message);
  }
}
