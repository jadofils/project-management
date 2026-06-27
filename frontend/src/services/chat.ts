import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4001';

let socket: Socket | null = null;

export interface OnlinePresence {
  project_id: string;
  count: number;
  users: { id: string; first_name: string; last_name: string; avatar_url: string | null }[];
}

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('[chat] socket connected');
  });

  socket.on('disconnect', () => {
    console.log('[chat] socket disconnected');
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinProject(projectId: string, user: { id: string; first_name: string; last_name: string; avatar_url: string | null }) {
  socket?.emit('join:project', { projectId, user });
}

export function leaveProject(projectId: string) {
  socket?.emit('leave:project', projectId);
}

let clientIdCounter = 0;

export function sendChatMessage(data: {
  project_id: string;
  content: string;
  type?: string;
  file_url?: string;
  file_name?: string;
  reply_to_id?: string;
  task_id?: string;
}): string {
  const clientId = `msg_${++clientIdCounter}_${Date.now()}`;
  socket?.emit('chat:send', { ...data, client_id: clientId });
  return clientId;
}

export function sendReadReceipt(projectId: string, messageId: string) {
  socket?.emit('chat:read', { project_id: projectId, message_id: messageId });
}

export function onChatMessage(cb: (msg: any) => void): () => void {
  socket?.on('chat:message', cb);
  return () => socket?.off('chat:message', cb);
}

export function onChatAck(cb: (data: { client_id: string; message_id: string }) => void): () => void {
  socket?.on('chat:ack', cb);
  return () => socket?.off('chat:ack', cb);
}

export function onPresenceUpdate(cb: (data: OnlinePresence) => void): () => void {
  socket?.on('presence:update', cb);
  return () => socket?.off('presence:update', cb);
}

export function onChatRead(cb: (data: { message_id: string; read_by: string }) => void): () => void {
  socket?.on('chat:read', cb);
  return () => socket?.off('chat:read', cb);
}
