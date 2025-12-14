import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
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

  emitNewMessage(conversationId: string, message: any) {
    this.server.to(conversationId).emit('newMessage', message);
  }
}
