import {
  LayoutDashboard, Kanban, CheckCircle2, MessageSquare, Flag, Layers,
  Calendar, ArrowRight, Zap, Shield, Users, BarChart3, ChevronRight,
  Star, Github, Twitter, Linkedin,
} from 'lucide-react';

const BWENGE_URL = import.meta.env.VITE_BWENGE_URL || 'http://localhost:3000';
const SELF_URL = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');

const FEATURES = [
  {
    icon: Kanban,
    color: 'bg-indigo-500',
    title: 'Kanban Board',
    desc: 'Visualise work across To Do, In Progress, Review and Done columns. Drag cards between columns with a single gesture.',
  },
  {
    icon: Flag,
    color: 'bg-rose-500',
    title: 'Priority & Phase Labels',
    desc: 'Tag every task with a priority (Critical → Low) and a dev phase (Backend, Frontend, QA…) so nothing gets lost.',
  },
  {
    icon: Calendar,
    color: 'bg-amber-500',
    title: 'Due Dates & Overdue Alerts',
    desc: 'Attach deadlines to tasks. Overdue cards are highlighted automatically so your team never misses a delivery.',
  },
  {
    icon: MessageSquare,
    color: 'bg-emerald-500',
    title: 'Inline Comments',
    desc: 'Discuss any task in-context. Leave comments, ask questions, and keep conversation tied to the work — not a separate chat.',
  },
  {
    icon: Layers,
    color: 'bg-violet-500',
    title: 'Multi-Project Workspace',
    desc: 'Manage unlimited projects under one account. Switch between them instantly from the header selector.',
  },
  {
    icon: Zap,
    color: 'bg-orange-500',
    title: 'Feedback System',
    desc: 'Capture bugs, feature requests and improvements straight from the app — with optional screenshot paste (Ctrl+V).',
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Sign in with Bwenge',
    desc: 'Use your existing Bwenge Learners account. No new password to remember — SSO handles everything.',
  },
  {
    number: '02',
    title: 'Create a project',
    desc: 'Name your project and hit Create. Your Kanban board is ready instantly with four columns pre-configured.',
  },
  {
    number: '03',
    title: 'Add tasks & ship',
    desc: 'Break work into tasks, assign priorities, set due dates, and drag cards across the board as work progresses.',
  },
];

const STATS = [
  { value: '4', label: 'Board columns', sub: 'To Do · In Progress · Review · Done' },
  { value: '5', label: 'Dev phases', sub: 'BE · FE · Doc · QA · Data' },
  { value: '4', label: 'Priority levels', sub: 'Critical · High · Medium · Low' },
  { value: '∞', label: 'Projects', sub: 'No hard limit on workspace size' },
];

const NAV_LINKS = ['Features', 'How it works', 'Pricing'];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2 font-bold text-lg">
            <span className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4 text-white" />
            </span>
            <span>ProManager</span>
          </a>

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(' ', '-')}`}
                className="text-sm text-gray-600 hover:text-indigo-600 transition-colors font-medium">
                {l}
              </a>
            ))}
          </div>

          <a
            href={`${BWENGE_URL}/login?redirect_to=${encodeURIComponent(SELF_URL)}`}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Get started <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-24 px-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 25% 60%, #6366f1 0%, transparent 50%), radial-gradient(circle at 75% 20%, #8b5cf6 0%, transparent 50%)' }} />

        <div className="relative max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-indigo-300 uppercase mb-6 border border-indigo-700 rounded-full px-4 py-1.5">
            <Star className="w-3 h-3 fill-indigo-400 text-indigo-400" />
            Built for Bwenge Learners teams
          </span>

          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight mb-6">
            Ship faster with<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
              visual project boards
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            A Trello-style project manager built for development teams. Kanban boards,
            task priorities, inline comments, and a built-in feedback system — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={`${BWENGE_URL}/login?redirect_to=${encodeURIComponent(SELF_URL)}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold rounded-2xl transition-all hover:shadow-lg hover:shadow-indigo-500/30 text-base"
            >
              Start for free <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-2xl transition-colors text-base border border-white/20"
            >
              See features
            </a>
          </div>
        </div>

        {/* Hero board preview */}
        <div className="relative max-w-5xl mx-auto mt-20 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
          <div className="bg-gray-800 px-4 py-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-gray-400 ml-3">Project Manager — Sprint 4</span>
          </div>
          <div className="bg-gray-900 p-6 grid grid-cols-4 gap-4">
            {[
              { label: 'To Do', color: 'bg-gray-700', cards: ['Setup auth middleware', 'Design DB schema'] },
              { label: 'In Progress', color: 'bg-blue-900', cards: ['Build API endpoints', 'Kanban drag-drop'] },
              { label: 'Review', color: 'bg-amber-900', cards: ['Code review PR #12'] },
              { label: 'Done', color: 'bg-green-900', cards: ['Project scaffolding', 'CI/CD pipeline', 'Deploy to Render'] },
            ].map(col => (
              <div key={col.label}>
                <div className={`${col.color} rounded-lg px-3 py-1.5 text-xs font-bold text-white mb-3 inline-block`}>{col.label}</div>
                <div className="space-y-2">
                  {col.cards.map(c => (
                    <div key={c} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                      <p className="text-xs text-gray-200">{c}</p>
                      <div className="flex gap-1 mt-2">
                        <span className="text-[10px] bg-indigo-900 text-indigo-300 px-1.5 py-0.5 rounded font-medium">FE</span>
                        <span className="text-[10px] bg-amber-900 text-amber-300 px-1.5 py-0.5 rounded font-medium">medium</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      <section className="border-b border-gray-100 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <p className="text-4xl font-extrabold text-indigo-600 mb-1">{s.value}</p>
              <p className="text-sm font-semibold text-gray-800">{s.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
              Everything your team needs
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              No bloat. Just the tools that matter for shipping software on time.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div key={f.title}
                className="group p-6 rounded-2xl border border-gray-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50 transition-all bg-white">
                <div className={`${f.color} w-11 h-11 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
              Up and running in minutes
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              No lengthy setup. Your board is ready the moment you log in.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <div key={s.number} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-indigo-200 to-transparent z-0" />
                )}
                <div className="relative z-10 bg-white rounded-2xl p-7 border border-gray-100 shadow-sm h-full">
                  <span className="text-5xl font-extrabold text-indigo-100 leading-none block mb-4">{s.number}</span>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust strip ─────────────────────────────────────────────────── */}
      <section className="py-16 px-6 border-y border-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {[
              { icon: Shield, title: 'SSO secured', desc: 'Access controlled by Bwenge Learners authentication — no separate credentials.' },
              { icon: Users, title: 'Role-aware', desc: 'Project managers see all projects. Members see only their own work.' },
              { icon: BarChart3, title: 'Built-in tracking', desc: 'Error logs, feedback reports, and issue tracking built right in.' },
            ].map(item => (
              <div key={item.title} className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-indigo-600" />
                </div>
                <h4 className="font-bold text-gray-900">{item.title}</h4>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-28 px-6 bg-gradient-to-br from-indigo-600 to-violet-700 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, white 0%, transparent 70%)' }} />
        <div className="relative max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-5 leading-tight">
            Ready to organise your team?
          </h2>
          <p className="text-indigo-200 text-lg mb-10">
            Sign in with your Bwenge Learners account — it takes less than 30 seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={`${BWENGE_URL}/login?redirect_to=${encodeURIComponent(SELF_URL)}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-indigo-700 font-bold rounded-2xl hover:bg-indigo-50 transition-colors text-base shadow-lg"
            >
              Sign in with Bwenge <ArrowRight className="w-4 h-4" />
            </a>
            <div className="flex items-center gap-2 text-indigo-200 text-sm">
              <CheckCircle2 className="w-4 h-4 text-indigo-300" /> Free to use · No credit card
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-white font-bold">
            <span className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <LayoutDashboard className="w-3.5 h-3.5 text-white" />
            </span>
            ProManager
          </div>

          <p className="text-sm text-center">
            Built for{' '}
            <a href={BWENGE_URL} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300">
              Bwenge Learners
            </a>{' '}
            teams · {new Date().getFullYear()}
          </p>

          <div className="flex items-center gap-4">
            <a href="https://github.com/jadofils/project-management" target="_blank" rel="noreferrer"
              className="hover:text-white transition-colors">
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
