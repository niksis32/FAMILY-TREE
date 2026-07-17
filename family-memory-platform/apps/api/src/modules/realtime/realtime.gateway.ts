import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { REALTIME_EVENTS, type NotificationSummary, type RealtimeEnvelope } from '@family/shared';
import type { Server, Socket } from 'socket.io';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { RealtimePubSubService } from './realtime-pubsub.service';

type SocketUser = { id: string; email: string; role: string };

@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  private readonly socketWorkspaces = new Map<string, Set<string>>();
  private readonly socketUserIds = new Map<string, string>();
  private readonly presenceByPerson = new Map<string, Map<string, SocketUser>>();

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly workspaces: WorkspacesService,
    private readonly pubsub: RealtimePubSubService,
  ) {}

  afterInit() {
    this.pubsub.onEnvelope((envelope) => this.broadcastEnvelope(envelope));
  }

  async handleConnection(client: Socket) {
    const user = await this.authenticate(client);
    if (!user) {
      client.disconnect(true);
      return;
    }

    client.data.user = user;
    await this.joinUserChannel(client, user.id);

    const workspaceId =
      typeof client.handshake.query.workspaceId === 'string'
        ? client.handshake.query.workspaceId
        : undefined;

    if (workspaceId) {
      try {
        await this.workspaces.assertMember(workspaceId, user.id);
        await this.joinWorkspace(client, workspaceId);
      } catch {
        client.disconnect(true);
      }
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = this.socketUserIds.get(client.id);
    if (userId) {
      this.socketUserIds.delete(client.id);
      client.leave(this.userRoom(userId));
    }

    const workspaces = this.socketWorkspaces.get(client.id);
    if (workspaces) {
      for (const wsId of workspaces) {
        await this.pubsub.unsubscribeWorkspace(wsId);
        client.leave(this.workspaceRoom(wsId));
      }
      this.socketWorkspaces.delete(client.id);
    }

    for (const [personId, viewers] of this.presenceByPerson) {
      if (viewers.delete(client.id)) {
        if (viewers.size === 0) this.presenceByPerson.delete(personId);
        this.emitPresence(personId);
      }
    }
  }

  @SubscribeMessage('workspace.join')
  async onWorkspaceJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { workspaceId?: string },
  ) {
    const user = client.data.user as SocketUser | undefined;
    if (!user?.id || !body?.workspaceId) return { ok: false };
    await this.workspaces.assertMember(body.workspaceId, user.id);
    await this.joinWorkspace(client, body.workspaceId);
    return { ok: true, workspaceId: body.workspaceId };
  }

  @SubscribeMessage('person.view')
  onPersonView(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { personId?: string },
  ) {
    const user = client.data.user as SocketUser | undefined;
    if (!user?.id || !body?.personId) return { ok: false };

    let viewers = this.presenceByPerson.get(body.personId);
    if (!viewers) {
      viewers = new Map();
      this.presenceByPerson.set(body.personId, viewers);
    }
    viewers.set(client.id, user);
    this.emitPresence(body.personId);
    return { ok: true };
  }

  @SubscribeMessage('person.leave')
  onPersonLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { personId?: string },
  ) {
    if (!body?.personId) return { ok: false };
    const viewers = this.presenceByPerson.get(body.personId);
    if (viewers?.delete(client.id) && viewers.size === 0) {
      this.presenceByPerson.delete(body.personId);
    }
    this.emitPresence(body.personId);
    return { ok: true };
  }

  private async joinWorkspace(client: Socket, workspaceId: string) {
    client.join(this.workspaceRoom(workspaceId));
    let set = this.socketWorkspaces.get(client.id);
    if (!set) {
      set = new Set();
      this.socketWorkspaces.set(client.id, set);
    }
    if (!set.has(workspaceId)) {
      set.add(workspaceId);
      await this.pubsub.subscribeWorkspace(workspaceId);
    }
  }

  private async joinUserChannel(client: Socket, userId: string) {
    client.join(this.userRoom(userId));
    this.socketUserIds.set(client.id, userId);
    await this.pubsub.subscribeUser(userId);
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }

  private workspaceRoom(workspaceId: string) {
    return `workspace:${workspaceId}`;
  }

  private broadcastEnvelope(envelope: RealtimeEnvelope) {
    if (envelope.event === REALTIME_EVENTS.NOTIFICATION_NEW) {
      const note = envelope.payload as NotificationSummary;
      if (note.userId) {
        this.server.to(this.userRoom(note.userId)).emit(envelope.event, envelope);
        return;
      }
    }

    if (!envelope.workspaceId) return;
    this.server.to(this.workspaceRoom(envelope.workspaceId)).emit(envelope.event, envelope);
  }

  private emitPresence(personId: string) {
    const viewers = this.presenceByPerson.get(personId);
    const payload = {
      personId,
      viewers: [...(viewers?.values() ?? [])].map((u) => ({
        userId: u.id,
        displayName: null as string | null,
      })),
    };
    this.server.emit(REALTIME_EVENTS.PRESENCE_UPDATE, {
      event: REALTIME_EVENTS.PRESENCE_UPDATE,
      workspaceId: '',
      payload,
      emittedAt: new Date().toISOString(),
    } satisfies RealtimeEnvelope);
  }

  private async authenticate(client: Socket): Promise<SocketUser | null> {
    const token =
      (typeof client.handshake.auth?.token === 'string' ? client.handshake.auth.token : null) ??
      (typeof client.handshake.query.token === 'string' ? client.handshake.query.token : null);

    if (!token) return null;
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) return null;

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; email: string; role: string }>(token, {
        secret,
      });
      return { id: payload.sub, email: payload.email, role: payload.role };
    } catch {
      this.logger.debug('WS auth failed');
      return null;
    }
  }
}
