import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, MessageCircle, ImagePlus, X, Reply, Paperclip, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api, type Message, type User, userInitials, userName } from '../services/api';
import { connectSocket, disconnectSocket, joinProject, onChatMessage, sendChatMessage } from '../services/chat';

interface Props {
  projectId: string;
  currentUser: User;
  allUsers: User[];
  onAskHelp?: (taskId: string, taskTitle: string) => void;
  helpTask?: { taskId: string; taskTitle: string } | null;
  clearHelpTask?: () => void;
}

export function ChatPanel({ projectId, currentUser, allUsers, onAskHelp, helpTask, clearHelpTask }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userMap = Object.fromEntries(allUsers.map(u => [u.id, u]));

  useEffect(() => {
    setLoading(true);
    api.getMessages(projectId).then(setMessages).catch(() => {}).finally(() => setLoading(false));

    const token = localStorage.getItem('accessToken') || '';
    connectSocket(token);
    joinProject(projectId, {
      id: currentUser.id,
      first_name: currentUser.first_name,
      last_name: currentUser.last_name,
      avatar_url: currentUser.avatar_url || null,
    });

    const unsub = onChatMessage((msg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, { ...msg, sender: msg.sender || userMap[msg.sender_id] || currentUser }];
      });
    });

    return () => {
      unsub();
      disconnectSocket();
    };
  }, [projectId]);

  useEffect(() => {
    if (helpTask?.taskId && helpTask?.taskTitle) {
      setText(`Need help with task: ${helpTask.taskTitle}`);
      setSending(false);
      setTimeout(() => clearHelpTask?.(), 100);
    }
  }, [helpTask]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (msgType = 'text') => {
    const content = text.trim();
    if (!content) return;
    setSending(true);
    setText('');

    sendChatMessage({
      project_id: projectId,
      content,
      type: msgType,
      reply_to_id: replyingTo?.id,
      task_id: helpTask?.taskId,
    });

    toast.success(msgType === 'help_request' ? 'Help request sent' : 'Message sent');
    setReplyingTo(null);
    setSending(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'task-manager');

      const res = await fetch(`https://api.cloudinary.com/v1_1/dhg5cd40b/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.secure_url) {
        sendChatMessage({
          project_id: projectId,
          content: text.trim() || `Shared ${file.type.startsWith('image/') ? 'an image' : 'a file'}: ${file.name}`,
          type: file.type.startsWith('image/') ? 'image' : 'file',
          file_url: data.secure_url,
          file_name: file.name,
          reply_to_id: replyingTo?.id,
        });
        setText('');
        setReplyingTo(null);
        toast.success('File sent');
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

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
        d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

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
          <span className={`text-[10px] text-gray-400 mb-0.5 ${isMe ? 'text-right' : ''}`}>
            {isMe ? 'You' : name} · {formatTime(msg.created_at)}
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
    <div className="flex flex-col h-full max-h-[calc(100vh-180px)]">
      <div className="px-4 py-3 border-b bg-white shrink-0 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-indigo-500" />Project Chat
          <span className="text-xs font-normal text-gray-400">(real-time)</span>
        </h3>
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
        <form
          onSubmit={e => { e.preventDefault(); send('text'); }}
          className="flex gap-2"
        >
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
            disabled={sending || uploading}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Attach image"
            className="px-2.5 py-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
          </button>
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 text-sm font-medium"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
