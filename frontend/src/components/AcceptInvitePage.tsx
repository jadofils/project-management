import { useState, useEffect } from 'react';
import { api, InvitationInfo, saveToken } from '../services/api';

interface Props {
  token: string;
  currentUser: { id: string; email: string } | null;
  onAccepted: (projectId: string) => void;
  onLoginRedirect: () => void;
}

export default function AcceptInvitePage({ token, currentUser, onAccepted, onLoginRedirect }: Props) {
  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);

  // Register form state (for new users)
  const [form, setForm] = useState({ first_name: '', last_name: '', password: '', confirm: '' });
  const [mode, setMode] = useState<'decide' | 'register'>('decide');

  useEffect(() => {
    api.getInvitationByToken(token)
      .then(data => { setInfo(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [token]);

  const handleAccept = async () => {
    if (!currentUser) { onLoginRedirect(); return; }
    setWorking(true);
    try {
      const res = await api.acceptInvitation(token);
      onAccepted(res.project_id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setWorking(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setWorking(true);
    try {
      const res = await api.registerAndAccept(token, {
        first_name: form.first_name,
        last_name: form.last_name,
        password: form.password,
      });
      saveToken(res.token);
      onAccepted(res.project_id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🔗</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Invalid or Expired Invitation</h1>
          <p className="text-gray-500 text-sm">{error}</p>
          <button onClick={onLoginRedirect} className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const role = info!.role.replace(/_/g, ' ');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 text-white">
          <p className="text-indigo-200 text-sm">Project Invitation</p>
          <h1 className="text-2xl font-bold mt-1">{info!.project?.name ?? 'a project'}</h1>
          {info!.inviterName && <p className="text-indigo-200 text-sm mt-1">Invited by {info!.inviterName}</p>}
        </div>

        <div className="px-8 py-6">
          {/* Role badge */}
          <div className="flex items-center gap-2 mb-6">
            <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full">{role}</span>
            <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">{info!.permission_level}</span>
          </div>

          {error && (
            <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2 rounded-lg">{error}</p>
          )}

          {/* Already logged in — just accept */}
          {currentUser && mode === 'decide' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                You're signed in as <strong>{currentUser.email}</strong>.
              </p>
              <button
                onClick={handleAccept}
                disabled={working}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition disabled:opacity-50"
              >
                {working ? 'Joining…' : 'Accept & Join Project'}
              </button>
              <button
                onClick={onLoginRedirect}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                Sign in with a different account
              </button>
            </div>
          )}

          {/* Not logged in, email exists → login */}
          {!currentUser && info!.emailExists && mode === 'decide' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                An account with <strong>{info!.email}</strong> already exists. Please sign in to accept the invitation.
              </p>
              <button
                onClick={onLoginRedirect}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition"
              >
                Sign In to Accept
              </button>
            </div>
          )}

          {/* Not logged in, new email → register */}
          {!currentUser && !info!.emailExists && mode === 'decide' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Create an account for <strong>{info!.email}</strong> and join immediately.
              </p>
              <button
                onClick={() => setMode('register')}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition"
              >
                Create Account & Join
              </button>
            </div>
          )}

          {/* Registration form */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
                  <input
                    required
                    value={form.first_name}
                    onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
                  <input
                    required
                    value={form.last_name}
                    onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input value={info!.email} readOnly className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={form.confirm}
                  onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <button
                type="submit"
                disabled={working}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition disabled:opacity-50"
              >
                {working ? 'Creating Account…' : 'Create Account & Join'}
              </button>
              <button type="button" onClick={() => setMode('decide')} className="w-full py-2 text-xs text-gray-400 hover:text-gray-600">
                Back
              </button>
            </form>
          )}

          {info!.expiresAt && (
            <p className="mt-5 text-xs text-gray-400 text-center">
              Invitation expires {new Date(info!.expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
