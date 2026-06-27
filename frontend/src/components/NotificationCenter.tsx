import { useState, useEffect, useRef } from 'react';
import { Bell, X, MessageCircle, CheckCircle, Clock, UserPlus } from 'lucide-react';
import { getSocket } from '../services/chat';
import { sendPushNotification } from '../services/notifications';

interface Notification {
  id: string;
  type: 'chat' | 'task' | 'invitation' | 'system';
  title: string;
  body: string;
  project_id?: string;
  created_at: string;
  read: boolean;
}

const STORAGE_KEY = 'ipfundo_notifications';

function loadStored(): Notification[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveStored(notifs: Notification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs.slice(0, 50)));
}

const ICONS: Record<string, React.ElementType> = {
  chat: MessageCircle, task: CheckCircle, invitation: UserPlus, system: Clock,
};
const COLORS: Record<string, string> = {
  chat: 'text-blue-500', task: 'text-green-500', invitation: 'text-purple-500', system: 'text-amber-500',
};

export function NotificationCenter() {
  const [notifs, setNotifs] = useState<Notification[]>(loadStored);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = notifs.filter(n => !n.read).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = (data: any) => {
      const n: Notification = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: data.type || 'system',
        title: data.title || 'Notification',
        body: data.body || '',
        project_id: data.project_id,
        created_at: new Date().toISOString(),
        read: false,
      };
      setNotifs(prev => { const updated = [n, ...prev]; saveStored(updated); return updated; });
      sendPushNotification(n.title, n.body);
    };
    socket.on('notification', handler);
    return () => { socket.off('notification', handler); };
  }, []);

  const markAllRead = () => {
    setNotifs(prev => { const updated = prev.map(n => ({ ...n, read: true })); saveStored(updated); return updated; });
    setOpen(false);
  };

  const remove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifs(prev => { const updated = prev.filter(n => n.id !== id); saveStored(updated); return updated; });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className="relative p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-2xl z-50 max-h-96 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[11px] text-indigo-500 hover:text-indigo-700 font-medium">Mark all read</button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {notifs.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No notifications yet</div>
            ) : (
              notifs.map(n => {
                const Icon = ICONS[n.type] || Clock;
                return (
                  <div key={n.id} className={`px-4 py-3 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 flex gap-3 cursor-pointer ${!n.read ? 'bg-indigo-50/40 dark:bg-indigo-900/20' : ''}`}>
                    <div className={`shrink-0 mt-0.5 ${COLORS[n.type]}`}><Icon className="w-4 h-4" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-200 font-medium leading-snug">{n.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{n.body}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{formatTime(n.created_at)}</p>
                    </div>
                    <button onClick={e => remove(n.id, e)} className="shrink-0 text-gray-300 hover:text-red-400"><X className="w-3 h-3" /></button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
