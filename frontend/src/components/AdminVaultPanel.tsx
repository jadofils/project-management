import { useState, useEffect, useRef, useMemo, type FormEvent, type ElementType } from 'react';
import {
  Link2, Lock, Share2, FileText, Plus, Search, Star, StarOff,
  Trash2, Edit3, X, Eye, EyeOff, Copy, ExternalLink, ChevronDown,
  ChevronRight, Globe, Pin, PinOff, Folder,
  Check, AlertTriangle, Instagram,
  Twitter, Linkedin, Youtube, Facebook,
  Bookmark, Mic, ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────
interface LinkItem {
  id: string; title: string; url: string; description?: string;
  category: string; subcategory?: string; tags: string[]; favorite: boolean; createdAt: string;
}
interface PasswordItem {
  id: string; site: string; username: string; password: string;
  category: string; notes?: string; url?: string; createdAt: string; updatedAt: string;
}
interface SocialItem {
  id: string; platform: string; handle: string; url: string;
  profileType: string; notes?: string; createdAt: string;
}
interface NoteItem {
  id: string; title: string; content: string; category: string;
  subcategory?: string; color: string; pinned: boolean; tags: string[];
  createdAt: string; updatedAt: string;
}
interface CategoryDef { name: string; color: string; subs: string[] }
type VaultTab = 'links' | 'passwords' | 'social' | 'notes';

// ── Default categories ────────────────────────────────────────────────────────
const DEFAULT_LINK_CATS: CategoryDef[] = [
  { name: 'AI & Machine Learning', color: '#6366f1', subs: ['Research Papers', 'Tools', 'Tutorials', 'Datasets'] },
  { name: 'Development',           color: '#3b82f6', subs: ['Frontend', 'Backend', 'DevOps', 'Databases', 'APIs'] },
  { name: 'Design',                color: '#ec4899', subs: ['UI/UX', 'Icons', 'Typography', 'Color Palettes'] },
  { name: 'Business',              color: '#f59e0b', subs: ['Strategy', 'Marketing', 'Finance', 'Startups'] },
  { name: 'Education',             color: '#10b981', subs: ['Online Courses', 'Bootcamps', 'Certifications'] },
  { name: 'Research Papers',       color: '#8b5cf6', subs: ['AI', 'Science', 'Social', 'Tech'] },
  { name: 'Tools & Utilities',     color: '#14b8a6', subs: ['Productivity', 'Automation', 'Analytics'] },
  { name: 'News & Trends',         color: '#f97316', subs: ['Tech News', 'Industry Reports', 'Blogs'] },
  { name: 'YouTube Channels',      color: '#ef4444', subs: ['Coding', 'Design', 'Business', 'Science'] },
  { name: 'Documentation',         color: '#64748b', subs: ['Frameworks', 'Libraries', 'Standards'] },
];
const DEFAULT_NOTE_CATS: CategoryDef[] = [
  { name: 'Ideas',          color: '#f59e0b', subs: ['Product', 'Content', 'Business', 'Personal'] },
  { name: 'Research',       color: '#6366f1', subs: ['AI', 'Market', 'Technical', 'Competitors'] },
  { name: 'Work',           color: '#3b82f6', subs: ['Projects', 'Clients', 'Deadlines', 'Reviews'] },
  { name: 'Personal',       color: '#ec4899', subs: ['Goals', 'Health', 'Finance', 'Learning'] },
  { name: 'Meeting Notes',  color: '#10b981', subs: ['Team', 'Client', 'Standup', 'Planning'] },
  { name: 'To-Do Lists',    color: '#f97316', subs: ['Today', 'This Week', 'Long-term'] },
  { name: 'Reference',      color: '#8b5cf6', subs: ['Commands', 'Config', 'Snippets', 'Cheatsheets'] },
  { name: 'Projects',       color: '#14b8a6', subs: ['Active', 'On Hold', 'Completed', 'Ideas'] },
  { name: 'Journal',        color: '#64748b', subs: ['Daily', 'Weekly', 'Reflections'] },
  { name: 'Archive',        color: '#94a3b8', subs: ['2024', '2023', 'Old Refs'] },
];
const NOTE_COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ec4899','#8b5cf6','#f97316','#14b8a6','#64748b','#ef4444'];
const SOCIAL_PLATFORMS = [
  { name:'Instagram',  color:'#e1306c', icon: Instagram  },
  { name:'Twitter/X',  color:'#000000', icon: Twitter    },
  { name:'LinkedIn',   color:'#0077b5', icon: Linkedin   },
  { name:'YouTube',    color:'#ff0000', icon: Youtube    },
  { name:'Facebook',   color:'#1877f2', icon: Facebook   },
  { name:'TikTok',     color:'#010101', icon: Mic        },
  { name:'Pinterest',  color:'#bd081c', icon: Bookmark   },
  { name:'GitHub',     color:'#333',    icon: Globe      },
  { name:'Snapchat',   color:'#fffc00', icon: Globe      },
  { name:'Telegram',   color:'#26a5e4', icon: Globe      },
  { name:'WhatsApp',   color:'#25d366', icon: Globe      },
  { name:'Reddit',     color:'#ff4500', icon: Globe      },
];
const PWD_CATS = ['Work','Personal','Social Media','Finance','Development','Email','Shopping','Gaming','Cloud','Other'];

// ── Local storage helpers ──────────────────────────────────────────────────────
function load<T>(key: string, def: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; }
}
function save<T>(key: string, val: T) { localStorage.setItem(key, JSON.stringify(val)); }
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// ── Password obfuscation (NOT encryption — local only) ────────────────────────
const enc = (s: string) => btoa(unescape(encodeURIComponent(s)));
const dec = (s: string) => { try { return decodeURIComponent(escape(atob(s))); } catch { return s; } }

// ── Searchable Select ──────────────────────────────────────────────────────────
function SearchableSelect({ value, onChange, options, placeholder = 'All categories' }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string; color?: string }[];
  placeholder?: string;
}) {
  const [open, setOpen]     = useState(false);
  const [q, setQ]           = useState('');
  const ref                 = useRef<HTMLDivElement>(null);
  const filtered            = options.filter(o => o.label.toLowerCase().includes(q.toLowerCase()));
  const selected            = options.find(o => o.value === value);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQ(''); } };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:border-indigo-300 transition-colors min-w-[180px] justify-between">
        <span className="flex items-center gap-1.5">
          {selected?.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: selected.color }} />}
          <span className="truncate">{selected?.label || placeholder}</span>
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-xl w-64 overflow-hidden">
          <div className="p-2 border-b dark:border-gray-700">
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-1.5">
              <Search className="w-3.5 h-3.5 text-gray-400" />
              <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search categories..."
                className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none placeholder-gray-400" />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto p-1">
            <button onClick={() => { onChange(''); setOpen(false); setQ(''); }}
              className="w-full text-left px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
              {placeholder}
            </button>
            {filtered.map(o => (
              <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); setQ(''); }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 rounded-lg transition-colors ${value === o.value ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                {o.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: o.color }} />}
                {o.label}
              </button>
            ))}
            {filtered.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No match</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Category tree sidebar ──────────────────────────────────────────────────────
function CategoryTree({ cats, selected, onSelect, counts }: {
  cats: CategoryDef[]; selected: string; onSelect: (c: string) => void; counts: Record<string, number>;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (name: string) => setExpanded(p => { const n = new Set(p); n.has(name) ? n.delete(name) : n.add(name); return n; });

  return (
    <div className="space-y-0.5">
      <button onClick={() => onSelect('')}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${selected === '' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
        <Folder className="w-3.5 h-3.5" />
        <span className="flex-1 text-left">All</span>
        <span className="text-[10px] font-bold text-gray-400">{Object.values(counts).reduce((a,b) => a+b, 0)}</span>
      </button>
      {cats.map(cat => (
        <div key={cat.name}>
          <button onClick={() => { onSelect(cat.name); toggle(cat.name); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors group ${selected === cat.name ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
            <span className="flex-1 text-left truncate">{cat.name}</span>
            <span className="text-[10px] font-bold text-gray-400">{counts[cat.name] || 0}</span>
            {cat.subs.length > 0 && (
              <ChevronRight className={`w-3 h-3 text-gray-400 transition-transform ${expanded.has(cat.name) ? 'rotate-90' : ''}`} />
            )}
          </button>
          {expanded.has(cat.name) && cat.subs.map(sub => (
            <button key={sub} onClick={() => onSelect(`${cat.name}::${sub}`)}
              className={`w-full flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-xl text-xs transition-colors ${selected === `${cat.name}::${sub}` ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-500 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0" />
              {sub}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Links Tab ─────────────────────────────────────────────────────────────────
function LinksTab() {
  const [cats]       = useState<CategoryDef[]>(() => load('vault_link_cats', DEFAULT_LINK_CATS));
  const [items, setItems] = useState<LinkItem[]>(() => load('vault_links', []));
  const [search, setSearch] = useState('');
  const [selCat, setSelCat] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LinkItem | null>(null);

  const persist = (next: LinkItem[]) => { setItems(next); save('vault_links', next); };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(it => {
      const catMatch = !selCat || (selCat.includes('::')
        ? it.category === selCat.split('::')[0] && it.subcategory === selCat.split('::')[1]
        : it.category === selCat);
      return catMatch && (!q || it.title.toLowerCase().includes(q) || it.url.toLowerCase().includes(q) || (it.description || '').toLowerCase().includes(q) || it.tags.some(t => t.toLowerCase().includes(q)));
    }).sort((a,b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0));
  }, [items, search, selCat]);

  const toggleFav = (id: string) => persist(items.map(it => it.id === id ? { ...it, favorite: !it.favorite } : it));
  const del = (id: string) => { if (confirm('Delete this link?')) persist(items.filter(it => it.id !== id)); };
  const catCounts = useMemo(() => {
    const m: Record<string, number> = {};
    items.forEach(it => { m[it.category] = (m[it.category] || 0) + 1; });
    return m;
  }, [items]);

  return (
    <div className="flex h-full gap-0">
      {/* Sidebar */}
      <div className="w-52 shrink-0 border-r dark:border-gray-700 p-3 overflow-y-auto">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-3 mb-2">Categories</p>
        <CategoryTree cats={cats} selected={selCat} onSelect={setSelCat} counts={catCounts} />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 p-4 border-b dark:border-gray-700">
          <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search links, tags, descriptions..."
              className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none placeholder-gray-400" />
            {search && <button onClick={() => setSearch('')}><X className="w-3.5 h-3.5 text-gray-400" /></button>}
          </div>
          <button onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 shrink-0">
            <Plus className="w-4 h-4" />Add Link
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <Link2 className="w-12 h-12 text-gray-200 dark:text-gray-700 mb-3" />
              <p className="text-sm font-medium text-gray-400">{search || selCat ? 'No links match your filter' : 'No links saved yet'}</p>
              <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Click "Add Link" to save your first resource</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.map(it => {
                const cat = cats.find(c => c.name === it.category);
                return (
                  <div key={it.id} className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-4 hover:shadow-md transition-shadow group">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
                        <img src={`https://www.google.com/s2/favicons?domain=${it.url}&sz=32`} alt="" className="w-5 h-5"
                          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate flex-1">{it.title}</p>
                          <button onClick={() => toggleFav(it.id)} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {it.favorite ? <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> : <StarOff className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />}
                          </button>
                        </div>
                        <p className="text-xs text-blue-500 dark:text-blue-400 truncate mt-0.5">{it.url}</p>
                        {it.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{it.description}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {cat && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: cat.color + '20', color: cat.color }}>
                              {it.category}
                            </span>
                          )}
                          {it.subcategory && <span className="text-[10px] text-gray-400 dark:text-gray-500">{it.subcategory}</span>}
                          {it.tags.slice(0, 2).map(t => (
                            <span key={t} className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded">#{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-3 pt-2.5 border-t dark:border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={it.url} target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                        <ExternalLink className="w-3 h-3" />Open
                      </a>
                      <button onClick={() => { navigator.clipboard.writeText(it.url); toast.success('URL copied'); }}
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setEditing(it); setShowForm(true); }}
                        className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => del(it.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showForm && <LinkForm cats={cats} item={editing} onSave={item => {
        if (editing) persist(items.map(it => it.id === editing.id ? item : it));
        else persist([...items, item]);
        setShowForm(false); setEditing(null);
        toast.success(editing ? 'Link updated' : 'Link saved');
      }} onClose={() => { setShowForm(false); setEditing(null); }} />}
    </div>
  );
}

function LinkForm({ cats, item, onSave, onClose }: { cats: CategoryDef[]; item: LinkItem | null; onSave: (it: LinkItem) => void; onClose: () => void }) {
  const [title, setTitle]   = useState(item?.title || '');
  const [url, setUrl]       = useState(item?.url || '');
  const [desc, setDesc]     = useState(item?.description || '');
  const [cat, setCat]       = useState(item?.category || cats[0]?.name || '');
  const [sub, setSub]       = useState(item?.subcategory || '');
  const [tags, setTags]     = useState(item?.tags.join(', ') || '');
  const [fav, setFav]       = useState(item?.favorite || false);
  const selCat = cats.find(c => c.name === cat);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return toast.error('URL is required');
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    onSave({
      id: item?.id || uid(), title: title || url, url: fullUrl, description: desc || undefined,
      category: cat, subcategory: sub || undefined, tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      favorite: fav, createdAt: item?.createdAt || new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b dark:border-gray-700">
          <h3 className="font-bold text-gray-800 dark:text-gray-100">{item ? 'Edit Link' : 'Add New Link'}</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">URL *</label>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" required autoFocus
              className="mt-1 w-full px-3 py-2.5 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Auto-filled from URL"
              className="mt-1 w-full px-3 py-2.5 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="What is this link about?"
              className="mt-1 w-full px-3 py-2.5 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Category</label>
              <select value={cat} onChange={e => { setCat(e.target.value); setSub(''); }}
                className="mt-1 w-full px-3 py-2.5 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none">
                {cats.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Subcategory</label>
              <select value={sub} onChange={e => setSub(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none">
                <option value="">None</option>
                {selCat?.subs.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tags (comma separated)</label>
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="research, ai, paper"
              className="mt-1 w-full px-3 py-2.5 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <button type="button" onClick={() => setFav(f => !f)}
              className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${fav ? 'bg-amber-400 border-amber-400' : 'border-gray-300 dark:border-gray-600'}`}>
              {fav && <Check className="w-3 h-3 text-white" />}
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">Mark as favorite</span>
          </label>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700">{item ? 'Update' : 'Save Link'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Passwords Tab ─────────────────────────────────────────────────────────────
function PasswordsTab() {
  const [items, setItems]   = useState<PasswordItem[]>(() => load('vault_passwords', []));
  const [search, setSearch] = useState('');
  const [filterCat, setFCat] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]  = useState<PasswordItem | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const persist = (next: PasswordItem[]) => { setItems(next); save('vault_passwords', next); };
  const toggleReveal = (id: string) => setRevealed(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(it =>
      (!filterCat || it.category === filterCat) &&
      (!q || it.site.toLowerCase().includes(q) || it.username.toLowerCase().includes(q))
    );
  }, [items, search, filterCat]);

  const del = (id: string) => { if (confirm('Delete this password?')) persist(items.filter(it => it.id !== id)); };
  const copy = (text: string, label: string) => { navigator.clipboard.writeText(text); toast.success(`${label} copied`); };

  const catOptions = PWD_CATS.map(c => ({ value: c, label: c }));

  return (
    <div className="flex flex-col h-full">
      {/* Warning banner */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-400">Passwords are stored locally in your browser only. Clear site data will erase them. Export regularly.</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 p-4 border-b dark:border-gray-700">
        <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sites, usernames..."
            className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none placeholder-gray-400" />
          {search && <button onClick={() => setSearch('')}><X className="w-3.5 h-3.5 text-gray-400" /></button>}
        </div>
        <SearchableSelect value={filterCat} onChange={setFCat} options={catOptions} placeholder="All categories" />
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 shrink-0">
          <Plus className="w-4 h-4" />Add
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <Lock className="w-12 h-12 text-gray-200 dark:text-gray-700 mb-3" />
            <p className="text-sm font-medium text-gray-400">{search || filterCat ? 'No passwords match' : 'No passwords saved yet'}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10">
              <tr>
                {['Site / Service','Category','Username','Password','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {filtered.map(it => (
                <tr key={it.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                        {it.url
                          ? <img src={`https://www.google.com/s2/favicons?domain=${it.url}&sz=32`} alt="" className="w-4 h-4"
                              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                          : <Lock className="w-3.5 h-3.5 text-gray-400" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{it.site}</p>
                        {it.url && <p className="text-[10px] text-gray-400 truncate max-w-[120px]">{it.url}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">{it.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{it.username}</span>
                      <button onClick={() => copy(it.username, 'Username')}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-500 rounded transition-opacity">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-mono text-gray-700 dark:text-gray-300 select-none">
                        {revealed.has(it.id) ? dec(it.password) : '••••••••••'}
                      </span>
                      <button onClick={() => toggleReveal(it.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded">
                        {revealed.has(it.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                      <button onClick={() => copy(dec(it.password), 'Password')}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-500 rounded transition-opacity">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {it.url && (
                        <a href={it.url} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button onClick={() => { setEditing(it); setShowForm(true); }}
                        className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => del(it.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && <PasswordForm item={editing} onSave={item => {
        if (editing) persist(items.map(it => it.id === editing.id ? item : it));
        else persist([...items, item]);
        setShowForm(false); setEditing(null);
        toast.success(editing ? 'Password updated' : 'Password saved');
      }} onClose={() => { setShowForm(false); setEditing(null); }} />}
    </div>
  );
}

function PasswordForm({ item, onSave, onClose }: { item: PasswordItem | null; onSave: (it: PasswordItem) => void; onClose: () => void }) {
  const [site, setSite]     = useState(item?.site || '');
  const [url, setUrl]       = useState(item?.url || '');
  const [user, setUser]     = useState(item?.username || '');
  const [pwd, setPwd]       = useState(item ? dec(item.password) : '');
  const [cat, setCat]       = useState(item?.category || 'Work');
  const [notes, setNotes]   = useState(item?.notes || '');
  const [show, setShow]     = useState(false);

  const strength = useMemo(() => {
    if (!pwd) return 0;
    let s = 0;
    if (pwd.length >= 8) s++;
    if (pwd.length >= 14) s++;
    if (/[A-Z]/.test(pwd)) s++;
    if (/[0-9]/.test(pwd)) s++;
    if (/[^A-Za-z0-9]/.test(pwd)) s++;
    return s;
  }, [pwd]);
  const sColors = ['bg-red-500','bg-orange-500','bg-yellow-500','bg-lime-500','bg-green-500'];
  const sLabels = ['Very Weak','Weak','Fair','Strong','Very Strong'];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!site.trim() || !pwd.trim()) return toast.error('Site and password are required');
    onSave({
      id: item?.id || uid(), site, username: user, password: enc(pwd),
      category: cat, notes: notes || undefined, url: url || undefined,
      createdAt: item?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b dark:border-gray-700">
          <h3 className="font-bold text-gray-800 dark:text-gray-100">{item ? 'Edit Password' : 'Add Password'}</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Site / App *</label>
              <input value={site} onChange={e => setSite(e.target.value)} placeholder="Google, Netflix..." required autoFocus
                className="mt-1 w-full px-3 py-2.5 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">URL</label>
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..."
                className="mt-1 w-full px-3 py-2.5 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Username / Email</label>
            <input value={user} onChange={e => setUser(e.target.value)} placeholder="email@example.com"
              className="mt-1 w-full px-3 py-2.5 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Password *</label>
            <div className="relative mt-1">
              <input type={show ? 'text' : 'password'} value={pwd} onChange={e => setPwd(e.target.value)} placeholder="Enter password" required
                className="w-full px-3 py-2.5 pr-10 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-300 outline-none" />
              <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-2.5 text-gray-400">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {pwd && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[0,1,2,3,4].map(i => <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < strength ? sColors[strength-1] : 'bg-gray-200 dark:bg-gray-700'}`} />)}
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">{sLabels[strength-1] || 'Enter password'}</p>
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Category</label>
            <select value={cat} onChange={e => setCat(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none">
              {PWD_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Security questions, hints..."
              className="mt-1 w-full px-3 py-2.5 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700">{item ? 'Update' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Social Media Tab ──────────────────────────────────────────────────────────
function SocialTab() {
  const [items, setItems] = useState<SocialItem[]>(() => load('vault_social', []));
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SocialItem | null>(null);

  const persist = (next: SocialItem[]) => { setItems(next); save('vault_social', next); };
  const del = (id: string) => { if (confirm('Remove this account?')) persist(items.filter(it => it.id !== id)); };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(it => !q || it.platform.toLowerCase().includes(q) || it.handle.toLowerCase().includes(q));
  }, [items, search]);

  const grouped = useMemo(() => {
    const m: Record<string, SocialItem[]> = {};
    filtered.forEach(it => { (m[it.platform] = m[it.platform] || []).push(it); });
    return m;
  }, [filtered]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b dark:border-gray-700">
        <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search platforms, handles..."
            className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none placeholder-gray-400" />
          {search && <button onClick={() => setSearch('')}><X className="w-3.5 h-3.5 text-gray-400" /></button>}
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 shrink-0">
          <Plus className="w-4 h-4" />Add Account
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center">
            <Share2 className="w-12 h-12 text-gray-200 dark:text-gray-700 mb-3" />
            <p className="text-sm font-medium text-gray-400">No social accounts added yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([platform, accs]) => {
              const pDef = SOCIAL_PLATFORMS.find(p => p.name === platform);
              const PIcon = pDef?.icon || Globe;
              return (
                <div key={platform}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: pDef?.color || '#6366f1' }}>
                      <PIcon className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">{platform}</h3>
                    <span className="text-xs text-gray-400">{accs.length} account{accs.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {accs.map(it => (
                      <div key={it.id} className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-4 hover:shadow-md transition-shadow group">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: (pDef?.color || '#6366f1') + '20' }}>
                              <PIcon className="w-5 h-5" style={{ color: pDef?.color || '#6366f1' }} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-800 dark:text-gray-100">@{it.handle}</p>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">{it.profileType}</span>
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditing(it); setShowForm(true); }}
                              className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => del(it.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {it.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{it.notes}</p>}
                        <div className="flex gap-2">
                          <a href={it.url} target="_blank" rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-lg text-white transition-opacity hover:opacity-80"
                            style={{ background: pDef?.color || '#6366f1' }}>
                            <ExternalLink className="w-3 h-3" />Open
                          </a>
                          <button onClick={() => { navigator.clipboard.writeText(it.handle); toast.success('Handle copied'); }}
                            className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-1">
                            <Copy className="w-3 h-3" />Handle
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && <SocialForm item={editing} onSave={item => {
        if (editing) persist(items.map(it => it.id === editing.id ? item : it));
        else persist([...items, item]);
        setShowForm(false); setEditing(null);
        toast.success(editing ? 'Account updated' : 'Account added');
      }} onClose={() => { setShowForm(false); setEditing(null); }} />}
    </div>
  );
}

function SocialForm({ item, onSave, onClose }: { item: SocialItem | null; onSave: (it: SocialItem) => void; onClose: () => void }) {
  const [platform, setPlatform] = useState(item?.platform || 'Instagram');
  const [handle, setHandle]     = useState(item?.handle || '');
  const [url, setUrl]           = useState(item?.url || '');
  const [type, setType]         = useState(item?.profileType || 'Personal');
  const [notes, setNotes]       = useState(item?.notes || '');

  const pDef = SOCIAL_PLATFORMS.find(p => p.name === platform);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!handle.trim()) return toast.error('Handle is required');
    onSave({
      id: item?.id || uid(), platform, handle: handle.replace('@', ''),
      url: url || `https://${platform.toLowerCase().replace('/x','').replace(' ','')}.com/${handle.replace('@','')}`,
      profileType: type, notes: notes || undefined, createdAt: item?.createdAt || new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b dark:border-gray-700">
          <h3 className="font-bold text-gray-800 dark:text-gray-100">{item ? 'Edit Account' : 'Add Social Account'}</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Platform</label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {SOCIAL_PLATFORMS.map(p => {
                const PIcon = p.icon;
                return (
                  <button key={p.name} type="button" onClick={() => setPlatform(p.name)}
                    className={`flex flex-col items-center gap-1 py-2 rounded-xl border-2 transition-colors text-center ${platform === p.name ? 'border-current' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                    style={platform === p.name ? { borderColor: p.color, background: p.color + '15' } : {}}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: p.color }}>
                      <PIcon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[9px] text-gray-600 dark:text-gray-400 truncate w-full px-1">{p.name.split('/')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Handle / Username *</label>
              <input value={handle} onChange={e => setHandle(e.target.value)} placeholder="@yourusername" required autoFocus
                className="mt-1 w-full px-3 py-2.5 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Profile Type</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none">
                {['Personal','Business','Brand','Research','Community'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Profile URL</label>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder={`https://${platform.toLowerCase()}.com/...`}
              className="mt-1 w-full px-3 py-2.5 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Purpose, followers, niche..."
              className="mt-1 w-full px-3 py-2.5 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 text-white rounded-xl text-sm font-semibold hover:opacity-90"
              style={{ background: pDef?.color || '#6366f1' }}>
              {item ? 'Update' : 'Add Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Notes Tab ─────────────────────────────────────────────────────────────────
function NotesTab() {
  const [cats]       = useState<CategoryDef[]>(() => load('vault_note_cats', DEFAULT_NOTE_CATS));
  const [items, setItems] = useState<NoteItem[]>(() => load('vault_notes', []));
  const [search, setSearch] = useState('');
  const [selCat, setSelCat] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<NoteItem | null>(null);

  const persist = (next: NoteItem[]) => { setItems(next); save('vault_notes', next); };
  const togglePin = (id: string) => persist(items.map(it => it.id === id ? { ...it, pinned: !it.pinned } : it));
  const del = (id: string) => { if (confirm('Delete this note?')) persist(items.filter(it => it.id !== id)); };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(it => {
      const catMatch = !selCat || (selCat.includes('::')
        ? it.category === selCat.split('::')[0] && it.subcategory === selCat.split('::')[1]
        : it.category === selCat);
      return catMatch && (!q || it.title.toLowerCase().includes(q) || it.content.toLowerCase().includes(q) || it.tags.some(t => t.toLowerCase().includes(q)));
    }).sort((a,b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [items, search, selCat]);

  const catCounts = useMemo(() => {
    const m: Record<string, number> = {};
    items.forEach(it => { m[it.category] = (m[it.category] || 0) + 1; });
    return m;
  }, [items]);

  return (
    <div className="flex h-full gap-0">
      {/* Sidebar */}
      <div className="w-52 shrink-0 border-r dark:border-gray-700 p-3 overflow-y-auto">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-3 mb-2">Categories</p>
        <CategoryTree cats={cats} selected={selCat} onSelect={setSelCat} counts={catCounts} />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b dark:border-gray-700">
          <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes, tags, content..."
              className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none placeholder-gray-400" />
            {search && <button onClick={() => setSearch('')}><X className="w-3.5 h-3.5 text-gray-400" /></button>}
          </div>
          <button onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 shrink-0">
            <Plus className="w-4 h-4" />New Note
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <FileText className="w-12 h-12 text-gray-200 dark:text-gray-700 mb-3" />
              <p className="text-sm font-medium text-gray-400">{search || selCat ? 'No notes match' : 'No notes yet'}</p>
              <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Click "New Note" to start capturing ideas</p>
            </div>
          ) : (
            <div className="columns-1 md:columns-2 lg:columns-3 gap-3 space-y-3">
              {filtered.map(it => {
                const cat = cats.find(c => c.name === it.category);
                return (
                  <div key={it.id} className="break-inside-avoid bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-4 hover:shadow-md transition-shadow group cursor-pointer"
                    onClick={() => { setEditing(it); setShowForm(true); }}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: it.color }} />
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{it.title}</p>
                        {it.pinned && <Pin className="w-3 h-3 text-amber-500 shrink-0 fill-amber-500" />}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0" onClick={e => e.stopPropagation()}>
                        <button onClick={() => togglePin(it.id)} className="p-1 text-gray-400 hover:text-amber-500 rounded-lg">
                          {it.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => del(it.id)} className="p-1 text-gray-400 hover:text-red-500 rounded-lg">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-6 whitespace-pre-wrap">{it.content}</p>
                    <div className="flex items-center gap-2 mt-3 pt-2.5 border-t dark:border-gray-700 flex-wrap">
                      {cat && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: cat.color + '20', color: cat.color }}>{it.category}</span>}
                      {it.subcategory && <span className="text-[10px] text-gray-400 dark:text-gray-500">{it.subcategory}</span>}
                      {it.tags.slice(0, 2).map(t => (
                        <span key={t} className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded">#{t}</span>
                      ))}
                      <span className="ml-auto text-[10px] text-gray-300 dark:text-gray-600">
                        {new Date(it.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showForm && <NoteForm cats={cats} item={editing} onSave={item => {
        if (editing) persist(items.map(it => it.id === editing.id ? item : it));
        else persist([...items, item]);
        setShowForm(false); setEditing(null);
        toast.success(editing ? 'Note updated' : 'Note saved');
      }} onClose={() => { setShowForm(false); setEditing(null); }} />}
    </div>
  );
}

function NoteForm({ cats, item, onSave, onClose }: { cats: CategoryDef[]; item: NoteItem | null; onSave: (it: NoteItem) => void; onClose: () => void }) {
  const [title, setTitle]   = useState(item?.title || '');
  const [content, setContent] = useState(item?.content || '');
  const [cat, setCat]       = useState(item?.category || cats[0]?.name || '');
  const [sub, setSub]       = useState(item?.subcategory || '');
  const [color, setColor]   = useState(item?.color || NOTE_COLORS[0]);
  const [tags, setTags]     = useState(item?.tags.join(', ') || '');
  const [pinned, setPinned] = useState(item?.pinned || false);
  const selCat = cats.find(c => c.name === cat);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('Title is required');
    onSave({
      id: item?.id || uid(), title, content, category: cat,
      subcategory: sub || undefined, color, pinned,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      createdAt: item?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b dark:border-gray-700 shrink-0">
          <h3 className="font-bold text-gray-800 dark:text-gray-100">{item ? 'Edit Note' : 'New Note'}</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <form onSubmit={submit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            {/* Color picker */}
            <div className="flex items-center gap-2">
              {NOTE_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full transition-transform hover:scale-110 shrink-0"
                  style={{ background: c, outline: color === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }} />
              ))}
            </div>
            <div>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Note title..." required autoFocus
                className="w-full px-0 py-2 border-b-2 dark:border-gray-700 bg-transparent text-xl font-bold text-gray-800 dark:text-gray-100 outline-none focus:border-indigo-400 placeholder-gray-300 dark:placeholder-gray-600 transition-colors" />
            </div>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={12}
              placeholder="Start writing your note here..."
              className="w-full px-3 py-3 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl text-sm leading-relaxed focus:ring-2 focus:ring-indigo-300 outline-none resize-none placeholder-gray-300 dark:placeholder-gray-600" />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Category</label>
                <select value={cat} onChange={e => { setCat(e.target.value); setSub(''); }}
                  className="mt-1 w-full px-3 py-2.5 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none">
                  {cats.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Subcategory</label>
                <select value={sub} onChange={e => setSub(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none">
                  <option value="">None</option>
                  {selCat?.subs.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tags</label>
                <input value={tags} onChange={e => setTags(e.target.value)} placeholder="idea, urgent, ref"
                  className="mt-1 w-full px-3 py-2.5 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <button type="button" onClick={() => setPinned(p => !p)}
                className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${pinned ? 'bg-amber-400 border-amber-400' : 'border-gray-300 dark:border-gray-600'}`}>
                {pinned && <Check className="w-3 h-3 text-white" />}
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">Pin this note</span>
            </label>
          </div>
          <div className="flex gap-3 p-5 border-t dark:border-gray-700 shrink-0">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700">{item ? 'Update Note' : 'Save Note'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
export function AdminVaultPanel() {
  const [tab, setTab] = useState<VaultTab>('links');

  const tabs: { id: VaultTab; label: string; icon: ElementType; color: string }[] = [
    { id:'links',     label:'Links & Resources', icon:Link2,    color:'text-indigo-500' },
    { id:'passwords', label:'Passwords',          icon:Lock,     color:'text-red-500'    },
    { id:'social',    label:'Social Media',       icon:Share2,   color:'text-pink-500'   },
    { id:'notes',     label:'Notes',              icon:FileText, color:'text-green-500'  },
  ];

  // counts for tab badges
  const lCount  = (load<LinkItem[]>('vault_links', [])).length;
  const pwCount = (load<PasswordItem[]>('vault_passwords', [])).length;
  const smCount = (load<SocialItem[]>('vault_social', [])).length;
  const nCount  = (load<NoteItem[]>('vault_notes', [])).length;
  const counts  = [lCount, pwCount, smCount, nCount];

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 pt-5 pb-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Admin Vault</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">Personal resources, passwords, social media & notes — stored locally</p>
          </div>
        </div>
        {/* Tab bar */}
        <div className="flex items-center gap-1">
          {tabs.map((t, i) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors relative ${tab === t.id ? `border-indigo-500 text-indigo-600 dark:text-indigo-400` : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                <Icon className={`w-4 h-4 ${tab === t.id ? t.color : ''}`} />
                {t.label}
                {counts[i] > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                    {counts[i]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'links'     && <LinksTab />}
        {tab === 'passwords' && <PasswordsTab />}
        {tab === 'social'    && <SocialTab />}
        {tab === 'notes'     && <NotesTab />}
      </div>
    </div>
  );
}
