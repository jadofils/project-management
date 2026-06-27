import { useState, useEffect, useRef, useCallback } from 'react';
import React from 'react';
import { Send, Loader2, MessageCircle, ImagePlus, X, Reply, Paperclip, HelpCircle, Users, Check, CheckCheck, Download } from 'lucide-react';
import { toast } from 'sonner';
import { api, type Message, type User, type Project, userInitials, userName } from '../services/api';
import {
  connectSocket, disconnectSocket, joinProject, leaveProject,
  onChatMessage, onChatAck, onPresenceUpdate, onChatRead,
  sendChatMessage, sendReadReceipt, type OnlinePresence,
} from '../services/chat';
import { sendPushNotification } from '../services/notifications';

interface Props {
  currentUser: User;
  allUsers: User[];
  projects: Project[];
  activeProject?: Project | null;
  helpTask?: { taskId: string; taskTitle: string } | null;
  clearHelpTask?: () => void;
}

interface RoomInfo {
  project: Project;
  lastMessage?: string;
  lastTime?: string;
}

export const ChatRoomsPage = React.memo(function ChatRoomsPage({ currentUser, allUsers, projects, activeProject, helpTask, clearHelpTask }: Props) {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(activeProject?.id || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesCache, setMessagesCache] = useState<Record<string, Message[]>>({});
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [presence, setPresence] = useState<Map<string, OnlinePresence>>(new Map());
  const [pendingMessages, setPendingMessages] = useState<Set<string>>(new Set());
  const [deliveredMessages, setDeliveredMessages] = useState<Set<string>>(new Set());
  const [readMessages, setReadMessages] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedProject = projects.find(p => p.id === selectedRoom);
  const userMap = Object.fromEntries(allUsers.map(u => [u.id, u]));

  const loadMessages = useCallback(async (projectId: string) => {
    if (messagesCache[projectId]) {
      setMessages(messagesCache[projectId]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const msgs = await api.getMessages(projectId);
      setMessagesCache(prev => ({ ...prev, [projectId]: msgs }));
      setMessages(msgs);
    } catch { setMessages([]); }
    finally { setLoading(false); }
  }, [messagesCache]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken') || '';
    connectSocket(token);

    const unsubMessage = onChatMessage((msg) => {
      setMessagesCache(prev => {
        const room = prev[msg.project_id] || [];
        if (room.some(m => m.id === msg.id)) return prev;
        return { ...prev, [msg.project_id]: [...room, { ...msg, sender: msg.sender || userMap[msg.sender_id] }] };
      });
      // Push notification for messages from others
      if (msg.sender_id !== currentUser.id && document.hidden) {
        const sender = msg.sender || userMap[msg.sender_id];
        const name = sender ? `${sender.first_name} ${sender.last_name}` : 'Someone';
        sendPushNotification(`ipfundo — ${name}`, msg.content.slice(0, 100), window.location.href);
      }
    });

    const unsubAck = onChatAck(({ client_id, message_id }) => {
      setPendingMessages(prev => { const next = new Set(prev); next.delete(client_id); return next; });
      setDeliveredMessages(prev => { const next = new Set(prev); next.add(message_id); return next; });
    });

    const unsubPresence = onPresenceUpdate((data) => {
      setPresence(prev => { const next = new Map(prev); next.set(data.project_id, data); return next; });
    });

    const unsubRead = onChatRead(({ message_id }) => {
      setReadMessages(prev => { const next = new Set(prev); next.add(message_id); return next; });
    });

    return () => {
      unsubMessage(); unsubAck(); unsubPresence(); unsubRead();
      disconnectSocket();
    };
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom);
      joinProject(selectedRoom, {
        id: currentUser.id,
        first_name: currentUser.first_name,
        last_name: currentUser.last_name,
        avatar_url: currentUser.avatar_url || null,
      });

      return () => { leaveProject(selectedRoom); };
    }
  }, [selectedRoom, loadMessages, currentUser]);

  useEffect(() => {
    setMessages(messagesCache[selectedRoom || ''] || []);
  }, [selectedRoom, messagesCache]);

  useEffect(() => {
    if (helpTask?.taskId && helpTask?.taskTitle) {
      setText(`Need help with task: ${helpTask.taskTitle}`);
      setTimeout(() => clearHelpTask?.(), 100);
    }
  }, [helpTask]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (msgType = 'text') => {
    const content = text.trim();
    if (!content || !selectedRoom) return;
    setSending(true);
    setText('');

    const clientId = sendChatMessage({
      project_id: selectedRoom,
      content,
      type: msgType,
      reply_to_id: replyingTo?.id,
      task_id: helpTask?.taskId,
    });

    setPendingMessages(prev => { const next = new Set(prev); next.add(clientId); return next; });
    setReplyingTo(null);
    setSending(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRoom) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'task-manager');

      const res = await fetch('https://api.cloudinary.com/v1_1/dhg5cd40b/image/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.secure_url) {
        sendChatMessage({
          project_id: selectedRoom,
          content: text.trim() || `Shared ${file.type.startsWith('image/') ? 'an image' : 'a file'}: ${file.name}`,
          type: file.type.startsWith('image/') ? 'image' : 'file',
          file_url: data.secure_url,
          file_name: file.name,
          reply_to_id: replyingTo?.id,
        });
        setText('');
        setReplyingTo(null);
      } else {
        toast.error('Upload failed');
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSelectRoom = (projectId: string) => {
    setSelectedRoom(projectId);
    setReplyingTo(null);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
        d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIcon = (msg: Message, isMe: boolean) => {
    if (!isMe) return null;
    if (readMessages.has(msg.id)) return <CheckCheck className="w-3 h-3 text-blue-500" />;
    if (deliveredMessages.has(msg.id)) return <CheckCheck className="w-3 h-3 text-gray-400" />;
    return <Check className="w-3 h-3 text-gray-300" />;
  };

  const roomInfos: RoomInfo[] = projects.map(p => {
    const msgs = messagesCache[p.id] || [];
    const last = msgs[msgs.length - 1];
    return {
      project: p,
      lastMessage: last?.content?.slice(0, 40),
      lastTime: last?.created_at || undefined,
    };
  });

  const renderMessage = (msg: Message) => {
    const isMe = msg.sender_id === currentUser.id;
    const sender = msg.sender || userMap[msg.sender_id];
    const name = sender ? userName(sender) : 'Unknown';
    const initials = sender ? userInitials(sender) : '?';
    const replyTo = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null;
    const isHelp = msg.type === 'help_request';
    const isFile = msg.type === 'image' || msg.type === 'file';

    return (
      <div key={msg.id} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5 ${isMe ? 'bg-indigo-500' : 'bg-gray-400'}`}>
          {sender?.avatar_url
            ? <img src={sender.avatar_url} alt={name} className="w-7 h-7 rounded-full object-cover" />
            : initials}
        </div>
        <div className={`max-w-[72%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
          <span className={`text-[10px] text-gray-400 mb-0.5 flex items-center gap-1 ${isMe ? 'text-right' : ''}`}>
            {isMe ? 'You' : name} · {formatTime(msg.created_at)}
            {getStatusIcon(msg, isMe)}
          </span>

          {replyTo && (
            <div className={`text-[10px] px-2 py-1 rounded-t-lg mb-0.5 italic max-w-full truncate ${isMe ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
              Replying to: {replyTo.content?.slice(0, 60)}{(replyTo.content?.length || 0) > 60 ? '...' : ''}
            </div>
          )}

          {isHelp && (
            <div className="flex items-center gap-1 mb-0.5">
              <HelpCircle className="w-3 h-3 text-amber-500" />
              <span className="text-[10px] text-amber-600 font-semibold">Help Request</span>
              {msg.task_id && <span className="text-[9px] text-amber-400">· Task</span>}
            </div>
          )}

          <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
            isHelp
              ? 'bg-amber-50 border border-amber-200 text-gray-800'
              : isMe
                ? 'bg-indigo-500 text-white rounded-tr-sm'
                : 'bg-white border text-gray-800 rounded-tl-sm'
          }`}>
            {isFile && msg.file_url ? (
              <div>
                {msg.type === 'image' ? (
                  <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
                    <img src={msg.file_url} alt={msg.file_name || 'Image'} className="max-w-full rounded-lg max-h-60 object-cover cursor-pointer" />
                  </a>
                ) : (
                  <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-indigo-600 hover:underline">
                    <Paperclip className="w-4 h-4" />
                    <span className="text-xs">{msg.file_name || 'Download file'}</span>
                  </a>
                )}
                {msg.content && <p className="mt-1">{msg.content}</p>}
              </div>
            ) : (
              <span>{msg.content}</span>
            )}
          </div>

          <button
            onClick={() => setReplyingTo(msg)}
            className="text-[10px] text-gray-400 hover:text-indigo-500 mt-0.5 flex items-center gap-0.5"
          >
            <Reply className="w-2.5 h-2.5" />Reply
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full max-h-[calc(100vh-110px)]">
      {/* Sidebar */}
      <div className="w-64 border-r bg-white shrink-0 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-indigo-500" />Chats
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {roomInfos.map(info => {
            const isActive = info.project.id === selectedRoom;
            const online = presence.get(info.project.id);
            const onlineCount = online?.count || 0;
            return (
              <button
                key={info.project.id}
                onClick={() => handleSelectRoom(info.project.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${isActive ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium truncate ${isActive ? 'text-indigo-700' : 'text-gray-700'}`}>
                    {info.project.name}
                  </span>
                  {onlineCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-green-600 font-medium shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      {onlineCount}
                    </span>
                  )}
                </div>
                {info.lastMessage && (
                  <p className={`text-xs mt-0.5 truncate ${isActive ? 'text-indigo-400' : 'text-gray-400'}`}>
                    {info.lastMessage}
                  </p>
                )}
              </button>
            );
          })}
          {projects.length === 0 && (
            <p className="text-center py-8 text-xs text-gray-400">No project rooms yet.</p>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedRoom && selectedProject ? (
          <>
            <div className="px-4 py-3 border-b bg-white shrink-0 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">{selectedProject.name}</h3>
                <p className="text-[10px] text-gray-400">
                  {(() => {
                    const p = presence.get(selectedRoom);
                    if (!p || p.count === 0) return 'No one online';
                    return `${p.count} online`;
                  })()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const p = presence.get(selectedRoom);
                  const onlineUsers = p?.users?.slice(0, 5) || [];
                  return <>{onlineUsers.map(u => (
                    <div key={u.id} title={`${u.first_name} ${u.last_name}`} className="relative">
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt={u.first_name} className="w-6 h-6 rounded-full object-cover" />
                        : <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-[8px] font-bold">{(u.first_name[0] || '') + (u.last_name[0] || '')}</div>}
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 ring-1 ring-white" />
                    </div>
                  ))}</>;
                })()}
                {(() => {
                  const p = presence.get(selectedRoom);
                  const remaining = (p?.count || 0) - 5;
                  if (remaining > 0) return (
                    <span className="text-[10px] text-gray-400 font-medium">+{remaining}</span>
                  );
                  return null;
                })()}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
              {loading && (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                </div>
              )}

              {!loading && messages.length === 0 && (
                <div className="text-center py-16 text-gray-400 text-sm">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No messages yet. Say something!
                </div>
              )}

              {messages.map(renderMessage)}
              <div ref={bottomRef} />
            </div>

            {replyingTo && (
              <div className="px-4 py-1.5 bg-indigo-50 border-t border-indigo-100 flex items-center gap-2 text-xs">
                <span className="text-indigo-600">Replying to: {replyingTo.content?.slice(0, 40)}...</span>
                <button onClick={() => setReplyingTo(null)} className="ml-auto text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
              </div>
            )}

            <div className="px-4 py-3 border-t bg-white shrink-0">
              <form onSubmit={e => { e.preventDefault(); send('text'); }} className="flex gap-2">
                <input
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Type a message…"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
                  disabled={sending || uploading}
                />
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} title="Attach image"
                  className="px-2.5 py-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                </button>
                <button type="submit" disabled={!text.trim() || sending}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 text-sm font-medium">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Select a project room to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
