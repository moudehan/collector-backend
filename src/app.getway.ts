import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface ClientMessage {
  message: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class AppGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  afterInit() {
    console.log('Socket.IO Gateway initialisé et prêt !');
  }

  @SubscribeMessage('messageToServer')
  handleMessage(
    @MessageBody() data: ClientMessage,
    @ConnectedSocket() client: Socket,
  ) {
    this.server.emit('messageToClient', {
      from: client.id,
      message: data.message,
    });
  }
}
