import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('join_notifications')
  joinRoom(@MessageBody() userId: string) {
    console.log('User joined notif WS:', userId);
    return { joined: `user_${userId}` };
  }

  sendToUser(userId: string, notification: any) {
    this.server.to(`user_${userId}`).emit('notification', notification);
  }
}
