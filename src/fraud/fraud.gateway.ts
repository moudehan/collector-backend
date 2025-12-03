import {
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class FraudGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  afterInit() {
    console.log('Fraud Gateway initialisée');
  }

  emitNewAlert(alert: any) {
    this.server.emit('new_fraud_alert', alert);
  }
}
