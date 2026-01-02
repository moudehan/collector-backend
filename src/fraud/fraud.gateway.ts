import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

type JwtPayload = {
  sub?: string;
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
};

function extractBearer(raw?: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  if (!t) return null;
  return t.toLowerCase().startsWith('bearer ') ? t.slice(7).trim() : t;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '=',
    );

    const json = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function hasAdminRole(payload: JwtPayload): boolean {
  const roles1 = payload.realm_access?.roles ?? [];
  const roles2 = Object.values(payload.resource_access ?? {}).flatMap(
    (x) => x.roles ?? [],
  );
  const roles = [...roles1, ...roles2].map((r) => r.toUpperCase());
  return roles.includes('ADMIN');
}

@WebSocketGateway({
  cors: { origin: '*' },
})
export class FraudGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  afterInit() {
    console.log('Fraud Gateway initialisée');
  }

  handleConnection(client: Socket) {
    const raw = client.handshake.auth?.token as unknown;
    const token = extractBearer(raw);
    if (!token) {
      client.disconnect(true);
      return;
    }

    const payload = decodeJwtPayload(token);
    if (!payload?.sub) {
      client.disconnect(true);
      return;
    }

    if (hasAdminRole(payload)) {
      void client.join('admins');
    }
  }

  emitNewAlert(alert: unknown) {
    this.server.to('admins').emit('new_fraud_alert', alert);
  }
}
