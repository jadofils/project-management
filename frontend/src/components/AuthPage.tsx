import { useState } from 'react';
import { LayoutDashboard, Loader2, Eye, EyeOff } from 'lucide-react';
import { api, saveToken, type User } from '../services/api';

type Tab = 'login' | 'register';

interface Props {
  onAuth: (user: User) => void;
}

export function AuthPage({ onAuth }: Props) {
  const [tab, setTab] = useState<Tab>('login');
  const [form, setForm] = useState({ email: '', password: '', first_name: '', last_name: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = tab === 'login'
        ? await api.login({ email: form.email, password: form.password })
        : await api.register({ email: form.email, password: form.password, first_name: form.first_name, last_name: form.last_name });
      saveToken(res.token);
      onAuth(res.user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl mb-4 shadow-lg">
            <LayoutDashboard className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Project Manager</h1>
          <p className="text-sm text-gray-500 mt-1">Team collaboration & project tracking</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b">
            {(['login', 'register'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); }}
                className={`flex-1 py-3.5 text-sm font-semibold capitalize transition-colors ${
                  tab === t
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="p-6 space-y-4">
            {tab === 'register' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">First Name</label>
                  <input
                    value={form.first_name} onChange={set('first_name')}
                    placeholder="Alice" required autoFocus
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Last Name</label>
                  <input
                    value={form.last_name} onChange={set('last_name')}
                    placeholder="Manager" required
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Email</label>
              <input
                type="email" value={form.email} onChange={set('email')}
                placeholder="you@company.com" required autoFocus={tab === 'login'}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'} value={form.password} onChange={set('password')}
                  placeholder={tab === 'register' ? 'Min 6 characters' : '••••••••'} required minLength={6}
                  className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition"
                />
                <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-2.5">
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors mt-1"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {tab === 'login' ? 'Sign In' : 'Create Account'}
            </button>

            {tab === 'login' && (
              <p className="text-center text-xs text-gray-400 pt-1">
                Demo: <span className="font-mono">admin@pm.local</span> / <span className="font-mono">admin123</span>
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
