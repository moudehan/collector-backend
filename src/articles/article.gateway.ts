import {
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class ArticleGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  afterInit() {
    console.log('Article Gateway initialisée');
  }

  emitNewArticleInterest(payload: any) {
    this.server.emit('new_article_interest', payload);
  }
}
