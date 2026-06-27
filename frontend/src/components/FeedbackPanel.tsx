import { useState } from 'react';
import { toast } from 'sonner';
import { Bug, Sparkles, Lightbulb, MessageCircle, X, Send, ImagePlus, Loader2, MessageSquare } from 'lucide-react';
import { api } from '../services/api';

export function FeedbackPanel({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc]   = useState('');
  const [category, setCategory] = useState('improvement');
  const [screenshot, setScreenshot] = useState('');
  const [sending, setSending] = useState(false);

  const handlePaste = (e: React.ClipboardEvent) => {
    for (let i = 0; i < e.clipboardData.items.length; i++) {
      if (e.clipboardData.items[i].type.startsWith('image/')) {
        const blob = e.clipboardData.items[i].getAsFile();
        if (blob) { const r = new FileReader(); r.onload = () => setScreenshot(r.result as string); r.readAsDataURL(blob); }
      }
    }
  };

  const send = async () => {
    if (!title.trim()) return;
    setSending(true);
    try {
      await api.createFeedback({ title, description: desc, category, page_url: window.location.href, screenshot });
      toast.success('Feedback sent!');
      setTitle(''); setDesc(''); setScreenshot('');
    } catch { toast.error('Failed to send feedback'); }
    finally { setSending(false); }
  };

  const cats = [
    { value: 'bug',         icon: Bug,         label: 'Bug' },
    { value: 'feature',     icon: Sparkles,    label: 'Feature' },
    { value: 'improvement', icon: Lightbulb,   label: 'Improve' },
    { value: 'other',       icon: MessageCircle, label: 'Other' },
  ];

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l z-50 flex flex-col" onPaste={handlePaste}>
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <h2 className="font-semibold flex items-center gap-2 text-gray-800">
          <MessageSquare className="w-4 h-4 text-indigo-500" />Send Feedback
        </h2>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-200 text-gray-500"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        <div className="grid grid-cols-4 gap-1">
          {cats.map(c => (
            <button key={c.value} onClick={() => setCategory(c.value)}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-xl text-xs font-medium transition-colors ${category === c.value ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
              <c.icon className="w-4 h-4" />{c.label}
            </button>
          ))}
        </div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title..." className="w-full p-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe your feedback..." className="w-full p-2.5 border rounded-xl text-sm h-24 resize-none focus:ring-2 focus:ring-indigo-300 outline-none" rows={4} />
        {screenshot ? (
          <div className="relative rounded-xl overflow-hidden border">
            <img src={screenshot} alt="Screenshot" className="w-full" />
            <button onClick={() => setScreenshot('')} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"><X className="w-3 h-3" /></button>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-xl p-5 text-center text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-400 transition-colors cursor-pointer">
            <ImagePlus className="w-5 h-5 mx-auto mb-1" />Paste a screenshot (Ctrl+V)
          </div>
        )}
      </div>
      <div className="p-4 border-t">
        <button onClick={send} disabled={sending || !title.trim()} className="w-full py-2.5 bg-indigo-500 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-indigo-600">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Send Feedback
        </button>
      </div>
    </div>
  );
}
