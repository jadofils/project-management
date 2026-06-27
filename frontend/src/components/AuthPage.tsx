import { useState } from 'react';
import { LayoutDashboard, Loader2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { api, saveToken, type User } from '../services/api';

interface Props {
  onAuth: (user: User) => void;
}

export function AuthPage({ onAuth }: Props) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Change-password step
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [newPwd, setNewPwd]           = useState('');
  const [newPwdConfirm, setNewPwdConfirm] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.login({ email: form.email, password: form.password });
      saveToken(res.token);
      if (res.user.must_change_password) {
        setPendingUser(res.user);
      } else {
        onAuth(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const submitNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd !== newPwdConfirm) { setError('Passwords do not match'); return; }
    if (newPwd.length < 6) { setError('Password must be at least 6 characters'); return; }
    setError('');
    setChangingPwd(true);
    try {
      await api.changePassword({ current_password: form.password, new_password: newPwd });
      const updated = { ...pendingUser!, must_change_password: false };
      onAuth(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setChangingPwd(false);
    }
  };

  // ── Must change password screen ───────────────────────────────────────────
  if (pendingUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-500 rounded-2xl mb-3 shadow">
              <KeyRound className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Set Your Password</h1>
            <p className="text-sm text-gray-500 mt-1">Your account requires a new password before you can continue.</p>
          </div>
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <form onSubmit={submitNewPassword} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block uppercase tracking-wide">New Password</label>
                <input
                  type="password" required minLength={6}
                  value={newPwd} onChange={e => setNewPwd(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-300 outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block uppercase tracking-wide">Confirm Password</label>
                <input
                  type="password" required minLength={6}
                  value={newPwdConfirm} onChange={e => setNewPwdConfirm(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-300 outline-none"
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</p>
              )}
              <button
                type="submit" disabled={changingPwd}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {changingPwd ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Set Password & Continue
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── Login screen ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl mb-4 shadow-lg">
            <LayoutDashboard className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Project Manager</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your workspace</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
            <h2 className="text-white font-semibold text-base">Welcome back</h2>
            <p className="text-indigo-200 text-xs mt-0.5">Your team is waiting for you</p>
          </div>

          <form onSubmit={submit} className="p-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide">Email</label>
              <input
                type="email" value={form.email} onChange={set('email')}
                placeholder="you@company.com" required autoFocus
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'} value={form.password} onChange={set('password')}
                  placeholder="••••••••" required minLength={6}
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
              className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors mt-2"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Signing in…</>
                : 'Sign In'}
            </button>

            {loading && (
              <p className="text-center text-xs text-gray-400 animate-pulse">
                Server may be waking up — this can take up to 20 seconds on first load.
              </p>
            )}
          </form>

          <div className="px-6 pb-5 text-center">
            <p className="text-xs text-gray-400">
              Don't have an account? Contact your project manager — they'll set you up.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
