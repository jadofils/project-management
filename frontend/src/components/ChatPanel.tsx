import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, MessageCircle } from 'lucide-react';
import { api, type Message, type User, userInitials, userName } from '../services/api';
import { toast } from 'sonner';

interface Props {
  projectId: string;
  currentUser: User;
}

export function ChatPanel({ projectId, currentUser }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const msgs = await api.getMessages(projectId);
      setMessages(msgs);
    } catch { /* silent */ }
  };

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [projectId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const content = text.trim();
    if (!content) return;
    setSending(true);
    setText('');
    try {
      const msg = await api.sendMessage(projectId, content);
      setMessages(prev => [...prev, { ...msg, sender: currentUser }]);
    } catch (e: any) {
      toast.error(e.message || 'Failed to send');
      setText(content);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-180px)]">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-white shrink-0">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-indigo-500" />Project Chat
          <span className="text-xs font-normal text-gray-400">(auto-refreshes every 8s)</span>
        </h3>
      </div>

      {/* Messages */}
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

        {messages.map(msg => {
          const isMe = msg.sender_id === currentUser.id;
          const sender = msg.sender;
          const name = sender ? userName(sender) : 'Unknown';
          const initials = sender ? userInitials(sender) : '?';

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
                <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                  isMe ? 'bg-indigo-500 text-white rounded-tr-sm' : 'bg-white border text-gray-800 rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t bg-white shrink-0">
        <form
          onSubmit={e => { e.preventDefault(); send(); }}
          className="flex gap-2"
        >
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
            disabled={sending}
          />
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
