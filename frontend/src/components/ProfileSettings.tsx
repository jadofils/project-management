import { useState } from 'react';
import { User, Save, Loader2, Camera, Moon, Sun, Type, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { api, type User as UserType, userName, userInitials } from '../services/api';
import { useTheme } from '../lib/ThemeContext';

interface Props {
  user: UserType;
  onUpdate: (u: UserType) => void;
}

export function ProfileSettings({ user, onUpdate }: Props) {
  const { theme, toggleTheme, fontSize, setFontSize } = useTheme();
  const [tab, setTab] = useState<'profile' | 'password'>('profile');
  const [form, setForm] = useState({ first_name: user.first_name, last_name: user.last_name, bio: user.bio || '', phone: user.phone || '' });
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setPw = (k: keyof typeof pwForm) => (e: React.ChangeEvent<HTMLInputElement>) => setPwForm(f => ({ ...f, [k]: e.target.value }));

  const saveProfile = async () => {
    setSaving(true);
    try { const u = await api.updateUser(user.id, form as any); onUpdate(u); toast.success('Profile updated'); } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirm) return toast.error('Passwords do not match');
    if (pwForm.newPw.length < 6) return toast.error('Password must be at least 6 characters');
    setSaving(true);
    try { await api.changePassword({ current_password: pwForm.current, new_password: pwForm.newPw }); toast.success('Password changed'); setPwForm({ current: '', newPw: '', confirm: '' }); }
    catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file); fd.append('upload_preset', 'task-manager');
      const res = await fetch('https://api.cloudinary.com/v1_1/dhg5cd40b/image/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.secure_url) { const u = await api.updateUser(user.id, { avatar_url: data.secure_url }); onUpdate(u); toast.success('Avatar updated'); }
    } catch { toast.error('Upload failed'); }
    finally { setAvatarUploading(false); }
  };

  const tabs = [{ id: 'profile', icon: User, label: 'Profile' }, { id: 'password', icon: Lock, label: 'Password' }];

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 max-w-lg mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-5"><User className="w-5 h-5 text-indigo-500" />Settings</h2>

      <div className="flex items-center gap-1 mb-4 border-b dark:border-gray-700">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`text-sm px-4 py-2 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${tab === t.id ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}><t.icon className="w-3.5 h-3.5" />{t.label}</button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              {user.avatar_url ? <img src={user.avatar_url} alt={userName(user)} className="w-16 h-16 rounded-full object-cover" /> : <div className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xl font-bold">{userInitials(user)}</div>}
              <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm">
                {avatarUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" /> : <Camera className="w-3.5 h-3.5 text-gray-400" />}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            </div>
            <div><p className="font-semibold text-gray-800 dark:text-gray-100">{userName(user)}</p><p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">First</label><input value={form.first_name} onChange={set('first_name')} className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" /></div>
            <div><label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Last</label><input value={form.last_name} onChange={set('last_name')} className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" /></div>
          </div>
          <div><label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Phone</label><input value={form.phone} onChange={set('phone')} placeholder="+250..." className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" /></div>
          <div><label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Bio</label><textarea value={form.bio} onChange={set('bio')} placeholder="Tell us about yourself..." rows={3} className="w-full px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-300 outline-none" /></div>
          <button onClick={saveProfile} disabled={saving} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save Changes</button>
        </div>
      )}

      {tab === 'password' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
          <form onSubmit={changePassword} className="space-y-4">
            {(['current', 'newPw', 'confirm'] as const).map(k => (
              <div key={k}>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{k === 'current' ? 'Current Password' : k === 'newPw' ? 'New Password' : 'Confirm Password'}</label>
                <div className="relative">
                  <input type={showPw[k] ? 'text' : 'password'} value={pwForm[k]} onChange={setPw(k)} required className="w-full px-3 py-2 pr-10 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
                  <button type="button" onClick={() => setShowPw(f => ({ ...f, [k]: !f[k] }))} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"><EyeOff className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            <button type="submit" disabled={saving} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}Change Password</button>
          </form>
        </div>
      )}

      {/* Theme & Font Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 mt-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2"><Moon className="w-4 h-4 text-indigo-500" />Appearance</h3>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-300">Theme</span>
          <button onClick={toggleTheme} className={`relative w-12 h-6 rounded-full transition-colors ${theme === 'dark' ? 'bg-indigo-600' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0.5'} flex items-center justify-center`}>
              {theme === 'dark' ? <Moon className="w-3 h-3 text-indigo-600" /> : <Sun className="w-3 h-3 text-amber-500" />}
            </span>
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-300">Font Size</span>
          <div className="flex gap-1">
            {(['sm', 'md', 'lg'] as const).map(s => (
              <button key={s} onClick={() => setFontSize(s)}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${fontSize === s ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                {s === 'sm' ? 'Small' : s === 'md' ? 'Medium' : 'Large'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
