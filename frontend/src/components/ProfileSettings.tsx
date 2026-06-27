import { useState } from 'react';
import { User, Save, Loader2, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { api, type User as UserType, userName, userInitials } from '../services/api';

interface Props {
  user: UserType;
  onUpdate: (u: UserType) => void;
}

export function ProfileSettings({ user, onUpdate }: Props) {
  const [form, setForm] = useState({
    first_name: user.first_name,
    last_name: user.last_name,
    bio: user.bio || '',
    phone: user.phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.updateUser(user.id, form as any);
      onUpdate(updated);
      toast.success('Profile updated');
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'task-manager');
      const res = await fetch('https://api.cloudinary.com/v1_1/dhg5cd40b/image/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.secure_url) {
        const updated = await api.updateUser(user.id, { avatar_url: data.secure_url });
        onUpdate(updated);
        toast.success('Avatar updated');
      }
    } catch { toast.error('Upload failed'); }
    finally { setAvatarUploading(false); }
  };

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 max-w-lg mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-5"><User className="w-5 h-5 text-indigo-500" />Profile & Settings</h2>

      <div className="bg-white rounded-xl border p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={userName(user)} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xl font-bold">{userInitials(user)}</div>
            )}
            <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-white border rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-50 shadow-sm">
              {avatarUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" /> : <Camera className="w-3.5 h-3.5 text-gray-400" />}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
          </div>
          <div>
            <p className="font-semibold text-gray-800">{userName(user)}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${user.system_role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{user.system_role}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">First Name</label>
            <input value={form.first_name} onChange={set('first_name')} className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Last Name</label>
            <input value={form.last_name} onChange={set('last_name')} className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Phone</label>
          <input value={form.phone} onChange={set('phone')} placeholder="+250..." className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Bio</label>
          <textarea value={form.bio} onChange={set('bio')} placeholder="Tell us about yourself..." rows={3}
            className="w-full px-3 py-2 border rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-300 outline-none" />
        </div>

        <button onClick={save} disabled={saving}
          className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save Changes
        </button>
      </div>
    </div>
  );
}
