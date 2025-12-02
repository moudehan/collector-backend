import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class FraudGateway {
  @WebSocketServer()
  server: Server;

  emitNewAlert(alert: any) {
    console.log('📢 Nouvelle alerte envoyée au front !');
    this.server.emit('newFraudAlert', alert);
  }
}
