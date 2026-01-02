import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

type NewArticleInterestPayload = {
  userId: string;
  id?: number | string;
  type?: string;
  title?: string;
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  message?: string | unknown;
  article_id?: string;
  created_at?: Date | string;
  [key: string]: unknown;
};

@WebSocketGateway({
  cors: { origin: '*' },
})
export class ArticleGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  afterInit() {
    console.log('Article Gateway initialisée');
  }

  handleConnection(client: Socket) {
    const raw = client.handshake.auth?.token as string | undefined;

    const token = this.extractBearer(raw);
    if (!token) {
      client.disconnect(true);
      return;
    }

    const userId = this.decodeSub(token);
    if (!userId) {
      client.disconnect(true);
      return;
    }

    void client.join(`user:${userId}`);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    client.data.userId = userId;
  }

  emitNewArticleInterest(payload: NewArticleInterestPayload) {
    if (!payload.userId) {
      console.warn(
        'emitNewArticleInterest ignoré: payload.userId manquant',
        payload,
      );
      return;
    }

    this.server
      .to(`user:${payload.userId}`)
      .emit('new_article_interest', payload);
  }

  private extractBearer(raw?: string): string | null {
    if (!raw) return null;
    const t = raw.trim();
    if (!t) return null;
    return t.toLowerCase().startsWith('bearer ') ? t.slice(7).trim() : t;
  }

  private decodeSub(token: string): string | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(
        base64.length + ((4 - (base64.length % 4)) % 4),
        '=',
      );

      const json = Buffer.from(padded, 'base64').toString('utf8');
      const payload = JSON.parse(json) as { sub?: string };

      return payload.sub ?? null;
    } catch {
      return null;
    }
  }
}
