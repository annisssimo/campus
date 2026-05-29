import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SkipThrottle } from '@nestjs/throttler';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Task } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../auth/auth.service';
import { corsOriginDelegate } from '../common/cors/cors.util';

const USER_ROOM_PREFIX = 'user:';

export interface TaskPurgedPayload {
  id: string;
  userId: string;
  deletedAt: Date | null;
}

@SkipThrottle()
@WebSocketGateway({
  namespace: '/tasks',
  cors: { origin: corsOriginDelegate, credentials: true },
})
export class TasksGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(TasksGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      this.disconnectUnauthorized(client, 'Missing token');
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });
      const userId = payload.sub;
      client.data.userId = userId;
      await client.join(this.userRoom(userId));
      client.emit('join', { room: this.userRoom(userId) });
    } catch {
      this.disconnectUnauthorized(client, 'Invalid token');
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = client.data.userId as string | undefined;
    if (userId) {
      void client.leave(this.userRoom(userId));
    }
  }

  @SubscribeMessage('join')
  handleJoin(client: Socket): { room: string } | { error: string } {
    const userId = client.data.userId as string | undefined;
    if (!userId) {
      return { error: 'Unauthorized' };
    }
    return { room: this.userRoom(userId) };
  }

  emitTaskCreated(userId: string, task: Task): void {
    this.server.to(this.userRoom(userId)).emit('task:created', task);
  }

  emitTaskUpdated(userId: string, task: Task): void {
    this.server.to(this.userRoom(userId)).emit('task:updated', task);
  }

  emitTaskDeleted(userId: string, task: Task): void {
    this.server.to(this.userRoom(userId)).emit('task:deleted', task);
  }

  emitTaskStatusChanged(userId: string, task: Task): void {
    this.server.to(this.userRoom(userId)).emit('task:statusChanged', task);
  }

  emitTaskPurged(userId: string, payload: TaskPurgedPayload): void {
    this.server.to(this.userRoom(userId)).emit('task:purged', payload);
  }

  private userRoom(userId: string): string {
    return `${USER_ROOM_PREFIX}${userId}`;
  }

  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string') {
      return authToken;
    }

    const queryToken = client.handshake.query.token;
    if (typeof queryToken === 'string') {
      return queryToken;
    }
    if (Array.isArray(queryToken) && queryToken[0]) {
      return queryToken[0];
    }

    return null;
  }

  private disconnectUnauthorized(client: Socket, reason: string): void {
    this.logger.debug(`Disconnecting client ${client.id}: ${reason}`);
    client.disconnect(true);
  }
}
