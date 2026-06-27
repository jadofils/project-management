import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect,
  ConnectedSocket, MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { ProjectMessage } from '../database/entities';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

interface OnlineUser {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
}

@WebSocketGateway({ cors: { origin: '*', credentials: true } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  private userSockets = new Map<string, Set<string>>();
  private roomUsers = new Map<string, Map<string, OnlineUser>>();
  private userRooms = new Map<string, Set<string>>();

  constructor(
    @InjectRepository(ProjectMessage) private messages: Repository<ProjectMessage>,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token as string;
      if (!token) { client.disconnect(); return; }
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
      (client as any).userId = payload.sub;
      (client as any).userEmail = payload.email;

      const set = this.userSockets.get(payload.sub) || new Set();
      set.add(client.id);
      this.userSockets.set(payload.sub, set);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any).userId as string | undefined;
    if (userId) {
      const set = this.userSockets.get(userId);
      if (set) { set.delete(client.id); if (set.size === 0) this.userSockets.delete(userId); }

      const userRooms = this.userRooms.get(userId);
      if (userRooms) {
        for (const roomId of userRooms) {
          const room = this.roomUsers.get(roomId);
          if (room) {
            room.delete(userId);
            if (room.size === 0) this.roomUsers.delete(roomId);
          }
          this.broadcastPresence(roomId);
        }
      }
    }
  }

  private broadcastPresence(projectId: string) {
    const room = this.roomUsers.get(projectId);
    const online = room ? Array.from(room.values()) : [];
    this.server.to(projectId).emit('presence:update', {
      project_id: projectId,
      count: online.length,
      users: online,
    });
  }

  private isUserOnline(userId: string): boolean {
    const set = this.userSockets.get(userId);
    return !!set && set.size > 0;
  }

  @SubscribeMessage('join:project')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { projectId: string; user: OnlineUser },
  ) {
    const userId = (client as any).userId as string;
    if (!userId) return;

    client.join(data.projectId);

    let room = this.roomUsers.get(data.projectId);
    if (!room) { room = new Map(); this.roomUsers.set(data.projectId, room); }
    room.set(userId, data.user);

    let ur = this.userRooms.get(userId);
    if (!ur) { ur = new Set(); this.userRooms.set(userId, ur); }
    ur.add(data.projectId);

    this.broadcastPresence(data.projectId);
  }

  @SubscribeMessage('leave:project')
  handleLeave(@ConnectedSocket() client: Socket, @MessageBody() projectId: string) {
    const userId = (client as any).userId as string;
    if (!userId) return;

    client.leave(projectId);

    const room = this.roomUsers.get(projectId);
    if (room) { room.delete(userId); }

    const ur = this.userRooms.get(userId);
    if (ur) { ur.delete(projectId); }

    this.broadcastPresence(projectId);
  }

  @SubscribeMessage('chat:send')
  async handleSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      project_id: string;
      content: string;
      type?: string;
      file_url?: string;
      file_name?: string;
      reply_to_id?: string;
      task_id?: string;
      client_id?: string;
    },
  ) {
    const userId = (client as any).userId as string;
    if (!userId) return;

    const msg = this.messages.create({
      project_id: data.project_id,
      sender_id: userId,
      content: data.content,
      type: data.type || 'text',
      file_url: data.file_url || null,
      file_name: data.file_name || null,
      reply_to_id: data.reply_to_id || null,
      task_id: data.task_id || null,
    } as any);
    const saved = await this.messages.save(msg) as unknown as ProjectMessage;

    const full: any = await this.messages.findOne({
      where: { id: saved.id },
      relations: ['sender'],
    });

    const serialized = full ? {
      id: full.id,
      project_id: full.project_id,
      sender_id: full.sender_id,
      content: full.content,
      type: full.type,
      file_url: full.file_url,
      file_name: full.file_name,
      reply_to_id: full.reply_to_id,
      task_id: full.task_id,
      status: 'delivered',
      created_at: full.created_at,
      sender: full.sender ? {
        id: full.sender.id,
        first_name: full.sender.first_name,
        last_name: full.sender.last_name,
        email: full.sender.email,
        avatar_url: full.sender.avatar_url,
      } : null,
    } : null;

    this.server.to(data.project_id).emit('chat:message', serialized);

    // Send push notification to offline members
    this.server.to(data.project_id).emit('notification', {
      type: 'chat',
      title: 'New message',
      body: `${serialized?.sender?.first_name || 'Someone'}: ${data.content.slice(0, 60)}`,
      project_id: data.project_id,
    });

    if (data.client_id) {
      client.emit('chat:ack', { client_id: data.client_id, message_id: saved.id });
    }
  }

  @SubscribeMessage('chat:read')
  handleRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { project_id: string; message_id: string },
  ) {
    this.server.to(data.project_id).emit('chat:read', {
      message_id: data.message_id,
      read_by: (client as any).userId,
    });
  }
}
