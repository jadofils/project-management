import { useState, useEffect } from 'react';
import React from 'react';
import { toast } from 'sonner';
import {
  Plus, X, Loader2, MessageSquare, Send, Bug, Sparkles, Lightbulb, MessageCircle,
  ImagePlus, ChevronDown, ChevronUp, Reply,
} from 'lucide-react';
import { api, type FeedbackItem, type FeedbackReply, type User, userInitials, userName } from '../services/api';
import { ProposalsPanel } from './ProposalsPanel';

interface Props {
  projectId: string;
  currentUser: User;
  allUsers: User[];
}

export const FeedbackPage = React.memo(function FeedbackPage({ projectId, currentUser, allUsers }: Props) {
  const [activeTab, setActiveTab] = useState<'feedback' | 'proposals'>('feedback');
  const isAdmin = currentUser.system_role === 'admin';

  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('improvement');
  const [screenshot, setScreenshot] = useState('');
  const [sending, setSending] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, FeedbackReply[]>>({});
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [sendingReply, setSendingReply] = useState<Record<string, boolean>>({});

  const userMap = Object.fromEntries(allUsers.map(u => [u.id, u]));

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.getFeedback(projectId);
      setFeedbacks(res.data || []);
      setTotalPages(res.totalPages || 1);
      setPage(p);
    } catch {
      setFeedbacks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [projectId]);

  const loadReplies = async (feedbackId: string) => {
    try {
      const r = await api.getFeedbackReplies(feedbackId);
      setReplies(prev => ({ ...prev, [feedbackId]: r }));
    } catch { /* */ }
  };

  const handleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      if (!replies[id]) loadReplies(id);
    }
  };

  const handleReply = async (feedbackId: string) => {
    const text = replyTexts[feedbackId]?.trim();
    if (!text) return;
    setSendingReply(prev => ({ ...prev, [feedbackId]: true }));
    try {
      const reply = await api.addFeedbackReply(feedbackId, text);
      setReplies(prev => ({
        ...prev,
        [feedbackId]: [...(prev[feedbackId] || []), reply],
      }));
      setReplyTexts(prev => ({ ...prev, [feedbackId]: '' }));
      // Update reply count in the list
      setFeedbacks(prev => prev.map(f =>
        f.id === feedbackId ? { ...f, reply_count: f.reply_count + 1 } : f,
      ));
      toast.success('Reply added');
    } catch { toast.error('Failed to add reply'); }
    finally {
      setSendingReply(prev => ({ ...prev, [feedbackId]: false }));
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    for (let i = 0; i < e.clipboardData.items.length; i++) {
      if (e.clipboardData.items[i].type.startsWith('image/')) {
        const blob = e.clipboardData.items[i].getAsFile();
        if (blob) { const r = new FileReader(); r.onload = () => setScreenshot(r.result as string); r.readAsDataURL(blob); }
      }
    }
  };

  const create = async () => {
    if (!title.trim()) return;
    setSending(true);
    try {
      await api.createFeedback({ title, description: desc, category, project_id: projectId, screenshot });
      toast.success('Feedback submitted');
      setShowCreate(false);
      setTitle(''); setDesc(''); setScreenshot('');
      load(1);
    } catch { toast.error('Failed to submit feedback'); }
    finally { setSending(false); }
  };

  const cats = [
    { value: 'bug', icon: Bug, label: 'Bug' },
    { value: 'feature', icon: Sparkles, label: 'Feature' },
    { value: 'improvement', icon: Lightbulb, label: 'Improve' },
    { value: 'other', icon: MessageCircle, label: 'Other' },
  ];

  const catLabel = (c: string) => cats.find(x => x.value === c)?.label || c;
  const catIcon = (c: string) => cats.find(x => x.value === c)?.icon || MessageCircle;

  const statusLabel = (s: string) => ({
    open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed',
  }[s] || s);

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6" onPaste={handlePaste}>
      {/* Tab switcher */}
      <div className="max-w-3xl mx-auto mb-5">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('feedback')}
            className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all ${
              activeTab === 'feedback'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />Feedback
          </button>
          <button
            onClick={() => setActiveTab('proposals')}
            className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all ${
              activeTab === 'proposals'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />Proposals & Suggestions
          </button>
        </div>
      </div>

      {/* Proposals tab */}
      {activeTab === 'proposals' && (
        <div className="max-w-3xl mx-auto">
          <ProposalsPanel currentUser={currentUser} isAdmin={isAdmin} />
        </div>
      )}

      {/* Feedback tab */}
      {activeTab === 'feedback' && (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-500" />Feedback
          </h2>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 text-sm px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 font-medium"
          >
            <Plus className="w-4 h-4" />New Feedback
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
        ) : feedbacks.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No feedback yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {feedbacks.map(fb => {
              const CatIcon = catIcon(fb.category);
              const author = userMap[fb.user_id];
              const isExpanded = expandedId === fb.id;
              const fbReplies = replies[fb.id] || [];

              return (
                <div key={fb.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${fb.category === 'bug' ? 'bg-red-100' : fb.category === 'feature' ? 'bg-purple-100' : 'bg-indigo-100'}`}>
                        <CatIcon className={`w-4 h-4 ${fb.category === 'bug' ? 'text-red-500' : fb.category === 'feature' ? 'text-purple-500' : 'text-indigo-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-500 uppercase">
                            {catLabel(fb.category)}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            fb.status === 'open' ? 'bg-blue-100 text-blue-600' :
                            fb.status === 'in_progress' ? 'bg-amber-100 text-amber-600' :
                            'bg-green-100 text-green-600'
                          }`}>
                            {statusLabel(fb.status)}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-gray-800 mt-1.5">{fb.title}</h3>
                        {fb.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{fb.description}</p>
                        )}
                        {fb.screenshot_url && (
                          <img src={fb.screenshot_url} alt="Screenshot" className="mt-2 rounded-lg max-h-40 object-cover" />
                        )}
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                          <span>{author ? userName(author) : 'Unknown'}</span>
                          <span>{new Date(fb.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          <button
                            onClick={() => handleExpand(fb.id)}
                            className="flex items-center gap-0.5 text-indigo-500 hover:text-indigo-700 font-medium"
                          >
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            {fb.reply_count > 0 && <span>{fb.reply_count} {fb.reply_count === 1 ? 'reply' : 'replies'}</span>}
                            {fb.reply_count === 0 && <span>Reply</span>}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t bg-gray-50 px-4 py-3">
                      {fbReplies.map(reply => {
                        const replier = userMap[reply.user_id];
                        return (
                          <div key={reply.id} className="flex gap-2 py-1.5">
                            <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-white text-[8px] font-bold shrink-0 mt-0.5">
                              {replier ? userInitials(replier) : '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-medium text-gray-700">{replier ? userName(replier) : 'Unknown'}</span>
                                <span className="text-[9px] text-gray-400">{new Date(reply.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="text-xs text-gray-600 mt-0.5">{reply.content}</p>
                            </div>
                          </div>
                        );
                      })}

                      <div className="flex gap-2 mt-3">
                        <input
                          value={replyTexts[fb.id] || ''}
                          onChange={e => setReplyTexts(prev => ({ ...prev, [fb.id]: e.target.value }))}
                          placeholder="Write a reply..."
                          onKeyDown={e => e.key === 'Enter' && handleReply(fb.id)}
                          className="flex-1 px-3 py-1.5 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-300 outline-none"
                        />
                        <button
                          onClick={() => handleReply(fb.id)}
                          disabled={sendingReply[fb.id] || !(replyTexts[fb.id]?.trim())}
                          className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-1 text-xs"
                        >
                          {sendingReply[fb.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Reply className="w-3 h-3" />}
                          Reply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button disabled={page <= 1} onClick={() => load(page - 1)}
                  className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-30">
                  Prev
                </button>
                <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => load(page + 1)}
                  className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-30">
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      )} {/* end feedback tab */}

      {showCreate && activeTab === 'feedback' && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">New Feedback</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-1">
                {cats.map(c => (
                  <button key={c.value} onClick={() => setCategory(c.value)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl text-xs font-medium transition-colors ${category === c.value ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                    <c.icon className="w-4 h-4" />{c.label}
                  </button>
                ))}
              </div>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title..." autoFocus
                className="w-full p-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
              <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe your feedback..." rows={4}
                className="w-full p-2.5 border rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-300 outline-none" />
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
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
              <button onClick={create} disabled={sending || !title.trim()}
                className="px-4 py-2 text-sm bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-2">
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
