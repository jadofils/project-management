import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  ThumbsUp, ThumbsDown, MessageCircle, Plus, X, Loader2, Send,
  ChevronDown, ChevronUp, Lightbulb, Tag, CheckCircle, Clock,
  AlertCircle, XCircle, GitBranch, Sparkles, TrendingUp,
} from 'lucide-react';
import {
  api, type Proposal, type ProposalVoteRecord, type ProposalComment, type User,
  userInitials, userName,
} from '../services/api';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS = {
  open:         { label: 'Open',        color: 'bg-blue-100 text-blue-700',    icon: Lightbulb },
  planned:      { label: 'Planned',     color: 'bg-violet-100 text-violet-700', icon: Clock },
  in_progress:  { label: 'In Progress', color: 'bg-amber-100 text-amber-700',  icon: GitBranch },
  implemented:  { label: 'Implemented', color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  rejected:     { label: 'Rejected',    color: 'bg-red-100 text-red-700',      icon: XCircle },
} as const;

const TAGS = ['UI/UX', 'Performance', 'Security', 'Backend', 'Mobile', 'AI', 'Reporting', 'Other'];

// ── Avatar helper ─────────────────────────────────────────────────────────────
function Avatar({ user, size = 7 }: { user?: { first_name: string; last_name: string; avatar_url?: string | null } | null; size?: number }) {
  if (!user) return <div className={`w-${size} h-${size} rounded-full bg-gray-200`} />;
  const cls = `w-${size} h-${size} rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 bg-indigo-500 overflow-hidden`;
  return user.avatar_url
    ? <img src={user.avatar_url} alt={`${user.first_name} ${user.last_name}`} className={`${cls} object-cover`} />
    : <div className={cls}>{userInitials(user as any)}</div>;
}

// ── Vote reason modal ─────────────────────────────────────────────────────────
function AgainstReasonModal({ onSubmit, onClose }: { onSubmit: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-1">
          <ThumbsDown className="w-4 h-4 text-red-500" />
          <h3 className="font-semibold text-gray-900">Share your insight</h3>
        </div>
        <p className="text-xs text-gray-400 mb-4">Tell us why you think this shouldn't be implemented. Your feedback shapes the system.</p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. This would create security risks because..."
          rows={4}
          autoFocus
          className="w-full p-3 border rounded-xl text-sm resize-none focus:ring-2 focus:ring-red-200 outline-none"
        />
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
          <button
            onClick={() => { if (reason.trim()) onSubmit(reason.trim()); }}
            disabled={!reason.trim()}
            className="px-4 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 font-medium"
          >
            Submit Insight
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Votes breakdown panel ─────────────────────────────────────────────────────
function VotesBreakdown({ proposalId }: { proposalId: string }) {
  const [votes, setVotes] = useState<ProposalVoteRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProposalVotes(proposalId)
      .then(setVotes)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [proposalId]);

  const forVotes     = votes.filter(v => v.vote === 'for');
  const againstVotes = votes.filter(v => v.vote === 'against');

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-indigo-400" /></div>;

  return (
    <div className="grid grid-cols-2 gap-4 pt-3 pb-1">
      {/* Supporters */}
      <div>
        <p className="text-[11px] font-bold text-green-700 uppercase tracking-wider mb-2 flex items-center gap-1">
          <ThumbsUp className="w-3 h-3" /> Support ({forVotes.length})
        </p>
        {forVotes.length === 0
          ? <p className="text-xs text-gray-400 italic">No supporters yet</p>
          : forVotes.map(v => (
            <div key={v.id} className="flex items-start gap-2 mb-2">
              <Avatar user={v.user} size={6} />
              <div>
                <p className="text-[11px] font-medium text-gray-700">
                  {v.user ? `${v.user.first_name} ${v.user.last_name}` : 'Unknown'}
                </p>
                {v.reason && <p className="text-[10px] text-gray-500 italic mt-0.5">"{v.reason}"</p>}
              </div>
            </div>
          ))
        }
      </div>

      {/* Opponents */}
      <div>
        <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider mb-2 flex items-center gap-1">
          <ThumbsDown className="w-3 h-3" /> Against ({againstVotes.length})
        </p>
        {againstVotes.length === 0
          ? <p className="text-xs text-gray-400 italic">No objections yet</p>
          : againstVotes.map(v => (
            <div key={v.id} className="flex items-start gap-2 mb-2">
              <Avatar user={v.user} size={6} />
              <div>
                <p className="text-[11px] font-medium text-gray-700">
                  {v.user ? `${v.user.first_name} ${v.user.last_name}` : 'Unknown'}
                </p>
                {v.reason
                  ? <p className="text-[10px] text-red-500 italic mt-0.5">"{v.reason}"</p>
                  : <p className="text-[10px] text-gray-400 italic mt-0.5">No reason given</p>
                }
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ── Discussion thread ─────────────────────────────────────────────────────────
function Discussion({ proposalId, currentUserId }: { proposalId: string; currentUserId: string }) {
  const [comments, setComments] = useState<ProposalComment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.getProposalComments(proposalId)
      .then(setComments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [proposalId]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const c = await api.addProposalComment(proposalId, text.trim());
      setComments(p => [...p, c]);
      setText('');
    } catch { toast.error('Failed to post comment'); }
    finally { setSending(false); }
  };

  if (loading) return <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-gray-300" /></div>;

  return (
    <div>
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
        Discussion ({comments.length})
      </p>
      <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
        {comments.length === 0 && <p className="text-xs text-gray-400 italic">No comments yet. Start the discussion!</p>}
        {comments.map(c => (
          <div key={c.id} className="flex gap-2">
            <Avatar user={c.user} size={6} />
            <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] font-semibold text-gray-700">
                  {c.user ? `${c.user.first_name} ${c.user.last_name}` : 'Unknown'}
                </span>
                <span className="text-[10px] text-gray-400">
                  {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{c.content}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Share your thoughts..."
          className="flex-1 px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-indigo-200 outline-none"
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="px-3 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ── Proposal Card ─────────────────────────────────────────────────────────────
function ProposalCard({
  proposal, currentUser, isAdmin, onVoted, onStatusChanged,
}: {
  proposal: Proposal;
  currentUser: User;
  isAdmin: boolean;
  onVoted: (id: string, updated: Partial<Proposal>) => void;
  onStatusChanged: (id: string, updated: Proposal) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'votes' | 'discuss'>('votes');
  const [voting, setVoting] = useState(false);
  const [againstModal, setAgainstModal] = useState(false);
  const [statusEdit, setStatusEdit] = useState(false);
  const [newStatus, setNewStatus] = useState(proposal.status);
  const [versionInput, setVersionInput] = useState(proposal.version_tag || '');
  const [savingStatus, setSavingStatus] = useState(false);

  const myVote = proposal.user_vote?.vote;
  const total  = proposal.votes_for + proposal.votes_against;
  const forPct = total > 0 ? Math.round((proposal.votes_for / total) * 100) : 0;
  const StatusIcon = STATUS[proposal.status]?.icon || Lightbulb;

  const doVote = async (vote: 'for' | 'against', reason?: string) => {
    setVoting(true);
    try {
      await api.voteProposal(proposal.id, vote, reason);
      const wasMyVote = myVote === vote;
      onVoted(proposal.id, {
        votes_for: vote === 'for'
          ? (wasMyVote ? proposal.votes_for - 1 : proposal.votes_for + 1)
          : (myVote === 'for' ? proposal.votes_for - 1 : proposal.votes_for),
        votes_against: vote === 'against'
          ? (wasMyVote ? proposal.votes_against - 1 : proposal.votes_against + 1)
          : (myVote === 'against' ? proposal.votes_against - 1 : proposal.votes_against),
        user_vote: wasMyVote ? null : { vote, reason: reason || null },
      });
    } catch { toast.error('Vote failed'); }
    finally { setVoting(false); }
  };

  const saveStatus = async () => {
    setSavingStatus(true);
    try {
      const updated = await api.updateProposalStatus(proposal.id, newStatus, versionInput || undefined);
      if (updated) onStatusChanged(proposal.id, updated);
      setStatusEdit(false);
      toast.success('Status updated');
    } catch { toast.error('Failed to update status'); }
    finally { setSavingStatus(false); }
  };

  return (
    <>
      {againstModal && (
        <AgainstReasonModal
          onSubmit={reason => { setAgainstModal(false); doVote('against', reason); }}
          onClose={() => setAgainstModal(false)}
        />
      )}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {/* Card body */}
        <div className="p-4">
          <div className="flex gap-3">
            {/* Vote column */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <button
                onClick={() => !voting && doVote('for')}
                disabled={voting}
                title="Support this proposal"
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  myVote === 'for'
                    ? 'bg-green-500 text-white shadow-md'
                    : 'bg-gray-50 text-gray-400 hover:bg-green-50 hover:text-green-600'
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
              </button>
              <span className={`text-xs font-bold ${proposal.votes_for > 0 ? 'text-green-600' : 'text-gray-300'}`}>
                {proposal.votes_for}
              </span>
              <button
                onClick={() => { if (!voting) { if (myVote === 'against') doVote('against'); else setAgainstModal(true); } }}
                disabled={voting}
                title="Oppose this proposal"
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  myVote === 'against'
                    ? 'bg-red-500 text-white shadow-md'
                    : 'bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500'
                }`}
              >
                <ThumbsDown className="w-4 h-4" />
              </button>
              <span className={`text-xs font-bold ${proposal.votes_against > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                {proposal.votes_against}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Tags + status */}
              <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS[proposal.status]?.color}`}>
                  <StatusIcon className="w-2.5 h-2.5" />
                  {STATUS[proposal.status]?.label}
                </span>
                {proposal.version_tag && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-indigo-100 text-indigo-700 flex items-center gap-1">
                    <Tag className="w-2.5 h-2.5" />{proposal.version_tag}
                  </span>
                )}
                {proposal.tags?.map(t => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{t}</span>
                ))}
              </div>

              <h3 className="text-sm font-semibold text-gray-800 leading-snug">{proposal.title}</h3>
              {proposal.description && (
                <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{proposal.description}</p>
              )}

              {/* Vote bar */}
              {total > 0 && (
                <div className="mt-2.5 mb-1">
                  <div className="flex rounded-full overflow-hidden h-1.5 bg-red-100">
                    <div className="bg-green-400 transition-all" style={{ width: `${forPct}%` }} />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[9px] text-green-600 font-semibold">{forPct}% support</span>
                    <span className="text-[9px] text-red-500 font-semibold">{100 - forPct}% oppose</span>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1.5">
                  <Avatar user={proposal.author} size={5} />
                  <span className="text-[10px] text-gray-400">
                    {proposal.author ? `${proposal.author.first_name} ${proposal.author.last_name}` : 'Unknown'}
                  </span>
                </div>
                <span className="text-[10px] text-gray-300">·</span>
                <span className="text-[10px] text-gray-400">
                  {new Date(proposal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="text-[10px] text-gray-300">·</span>
                <button
                  onClick={() => setExpanded(e => !e)}
                  className="flex items-center gap-0.5 text-[10px] text-indigo-500 hover:text-indigo-700 font-medium"
                >
                  {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {proposal.comment_count > 0 ? `${proposal.comment_count} comment${proposal.comment_count !== 1 ? 's' : ''}` : 'Discuss'}
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setStatusEdit(s => !s)}
                    className="ml-auto text-[10px] text-gray-400 hover:text-indigo-600 font-medium border border-gray-200 hover:border-indigo-300 rounded-lg px-2 py-0.5"
                  >
                    Manage
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Admin status editor */}
          {statusEdit && isAdmin && (
            <div className="mt-3 pt-3 border-t flex items-center gap-2 flex-wrap">
              <select value={newStatus} onChange={e => setNewStatus(e.target.value as any)}
                className="text-xs border rounded-lg px-2 py-1.5 bg-white">
                {Object.entries(STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
              </select>
              <input value={versionInput} onChange={e => setVersionInput(e.target.value)}
                placeholder="Version tag (e.g. v2.1.0)"
                className="text-xs border rounded-lg px-2 py-1.5 bg-white flex-1 min-w-[140px]" />
              <button onClick={saveStatus} disabled={savingStatus}
                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {savingStatus ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                Save
              </button>
            </div>
          )}
        </div>

        {/* Expanded panel */}
        {expanded && (
          <div className="border-t bg-gray-50 px-4 py-4">
            <div className="flex gap-2 mb-3">
              {(['votes', 'discuss'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                    activeTab === tab ? 'bg-white border shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {tab === 'votes' ? `Votes · ${proposal.votes_for + proposal.votes_against}` : `Discussion · ${proposal.comment_count}`}
                </button>
              ))}
            </div>
            {activeTab === 'votes'
              ? <VotesBreakdown proposalId={proposal.id} />
              : <Discussion proposalId={proposal.id} currentUserId={currentUser.id} />
            }
          </div>
        )}
      </div>
    </>
  );
}

// ── Changelog ─────────────────────────────────────────────────────────────────
function Changelog() {
  const [entries, setEntries] = useState<{ version: string; proposals: Proposal[] }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getChangelog().then(setEntries).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-indigo-300" /></div>;
  if (!entries.length) return null;

  return (
    <div className="mt-8">
      <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-green-500" />System Changelog
        <span className="text-xs font-normal text-gray-400">(implemented proposals)</span>
      </h3>
      <div className="space-y-4">
        {entries.map(({ version, proposals }) => (
          <div key={version} className="border-l-2 border-green-300 pl-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full">{version}</span>
              <span className="text-[10px] text-gray-400">{proposals.length} change{proposals.length !== 1 ? 's' : ''}</span>
            </div>
            <ul className="space-y-1">
              {proposals.map(p => (
                <li key={p.id} className="flex items-start gap-2 text-xs text-gray-600">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">{p.title}</span>
                    {p.description && <span className="text-gray-400 ml-1">— {p.description.slice(0, 80)}{p.description.length > 80 ? '…' : ''}</span>}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-green-600">👍 {p.votes_for} supporters</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Create Proposal Modal ─────────────────────────────────────────────────────
function CreateModal({ onCreated, onClose }: { onCreated: (p: Proposal) => void; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc]   = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleTag = (t: string) =>
    setSelectedTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  const submit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const p = await api.createProposal({ title: title.trim(), description: desc.trim() || undefined, tags: selectedTags.length ? selectedTags : undefined });
      toast.success('Proposal submitted!');
      onCreated(p);
      onClose();
    } catch { toast.error('Failed to submit proposal'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <h2 className="font-semibold text-gray-900">New Proposal</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} autoFocus
              placeholder="What change or feature are you proposing?"
              className="w-full p-3 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="Explain why this change should be made, what problem it solves, and how it improves the system..."
              rows={4}
              className="w-full p-3 border rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-300 outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Category Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {TAGS.map(t => (
                <button key={t} onClick={() => toggleTag(t)}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                    selectedTags.includes(t)
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-5 pt-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
          <button onClick={submit} disabled={saving || !title.trim()}
            className="flex items-center gap-2 px-5 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 font-medium">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Submit Proposal
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ProposalsPanel ───────────────────────────────────────────────────────
const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'implemented', label: 'Implemented' },
  { value: 'rejected', label: 'Rejected' },
];

interface Props {
  currentUser: User;
  isAdmin: boolean;
}

export function ProposalsPanel({ currentUser, isAdmin }: Props) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter]       = useState('all');
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async (p = 1, f = filter) => {
    setLoading(true);
    try {
      const res = await api.getProposals(p, f === 'all' ? undefined : f);
      setProposals(res.data);
      setTotalPages(res.totalPages);
      setPage(p);
    } catch { setProposals([]); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(1, filter); }, [filter]);

  const handleVoted = (id: string, updated: Partial<Proposal>) => {
    setProposals(p => p.map(x => x.id === id ? { ...x, ...updated } : x));
  };

  const handleStatusChanged = (id: string, updated: Proposal) => {
    setProposals(p => p.map(x => x.id === id ? { ...x, ...updated } : x));
  };

  return (
    <div className="max-w-3xl mx-auto">
      {showCreate && (
        <CreateModal
          onCreated={p => setProposals(prev => [{ ...p, author: { id: currentUser.id, first_name: currentUser.first_name, last_name: currentUser.last_name, avatar_url: currentUser.avatar_url } }, ...prev])}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            Proposals & Suggestions
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Propose changes · vote · discuss · track implementation
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 text-sm px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium shadow-sm">
          <Plus className="w-3.5 h-3.5" />New Proposal
        </button>
      </div>

      {/* How it works */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-4 mb-5">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xl mb-1">💡</div>
            <p className="text-[11px] font-semibold text-gray-700">Propose</p>
            <p className="text-[10px] text-gray-400">Submit a change idea</p>
          </div>
          <div>
            <div className="text-xl mb-1">🗳️</div>
            <p className="text-[11px] font-semibold text-gray-700">Vote</p>
            <p className="text-[10px] text-gray-400">Support or oppose with reason</p>
          </div>
          <div>
            <div className="text-xl mb-1">🚀</div>
            <p className="text-[11px] font-semibold text-gray-700">Track</p>
            <p className="text-[10px] text-gray-400">See it move to implemented</p>
          </div>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-4 scrollbar-hide">
        {STATUS_FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              filter === f.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Proposal list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
        </div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No proposals yet</p>
          <p className="text-xs mt-1">Be the first to propose a change to the system!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {proposals.map(p => (
            <ProposalCard
              key={p.id}
              proposal={p}
              currentUser={currentUser}
              isAdmin={isAdmin}
              onVoted={handleVoted}
              onStatusChanged={handleStatusChanged}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button disabled={page <= 1} onClick={() => load(page - 1)}
            className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-30">Prev</button>
          <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => load(page + 1)}
            className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-30">Next</button>
        </div>
      )}

      {/* Changelog */}
      <Changelog />
    </div>
  );
}
