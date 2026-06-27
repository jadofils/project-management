import { useState, useEffect } from 'react';
import { Clock, QrCode, MapPin, RefreshCw, Loader2, Check, X, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api, userName } from '../services/api';

export function AttendancePanel() {
  const [tab, setTab] = useState<'today' | 'records'>('today');
  const [today, setToday] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrData, setQrData] = useState<any>(null);

  const loadToday = async () => {
    setLoading(true);
    try { setToday(await api.getTodayAttendance()); } catch { setToday(null); }
    finally { setLoading(false); }
  };

  const loadRecords = async () => {
    setLoading(true);
    try { const res = await api.getAttendanceRecords({ page: 1, limit: 50 }); setRecords(res.data || []); } catch { setRecords([]); }
    finally { setLoading(false); }
  };

  const generateQR = async () => {
    try { const d = await api.generateAttendanceToken(); setQrData(d); toast.success('QR code generated'); } catch (e: any) { toast.error(e.message); }
  };

  useEffect(() => { tab === 'today' ? loadToday() : loadRecords(); }, [tab]);

  const formatTime = (d: string) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 max-w-5xl mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-5"><Clock className="w-5 h-5 text-indigo-500" />Attendance</h2>

      <div className="flex items-center gap-1 mb-4 border-b">
        {[{ id: 'today', label: "Today's Log" }, { id: 'records', label: 'Records' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`text-sm px-4 py-2 font-medium border-b-2 transition-colors ${tab === t.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t.label}</button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div> : null}

      {tab === 'today' && today && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border p-4 text-center"><p className="text-2xl font-bold text-indigo-600">{today.total}</p><p className="text-xs text-gray-500">Total</p></div>
            <div className="bg-white rounded-xl border p-4 text-center"><p className="text-2xl font-bold text-green-600">{today.present.length}</p><p className="text-xs text-gray-500">Still In</p></div>
            <div className="bg-white rounded-xl border p-4 text-center"><p className="text-2xl font-bold text-blue-600">{today.completed}</p><p className="text-xs text-gray-500">Done</p></div>
          </div>

          {today.present.length > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Currently In</h3>
              <div className="space-y-2">
                {today.present.map((r: any) => (
                  <div key={r.id} className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="font-medium">{r.user ? userName(r.user) : r.user_id}</span>
                    <span className="text-gray-400 text-xs ml-auto">Since {formatTime(r.clock_in)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={generateQR} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
              <QrCode className="w-4 h-4" />Generate QR
            </button>
            <button onClick={loadToday} className="flex items-center gap-2 px-4 py-2 border text-gray-600 rounded-xl text-sm hover:bg-gray-50"><RefreshCw className="w-4 h-4" />Refresh</button>
          </div>

          {qrData && (
            <div className="bg-white rounded-xl border p-5 text-center">
              <p className="text-sm font-semibold mb-3">QR Token (valid 90 seconds)</p>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs break-all mb-2">{qrData.token}:{qrData.hash}</div>
              <p className="text-[10px] text-gray-400">Expires: {new Date(qrData.expires_at).toLocaleTimeString()}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'records' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase"><th className="text-left px-4 py-3">User</th><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Clock In</th><th className="text-left px-4 py-3">Clock Out</th><th className="text-left px-4 py-3">Status</th></tr></thead>
            <tbody className="divide-y">
              {records.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.user ? userName(r.user) : r.user_id}</td>
                  <td className="px-4 py-3 text-gray-500">{r.date}</td>
                  <td className="px-4 py-3">{r.clock_in ? formatTime(r.clock_in) : '—'}</td>
                  <td className="px-4 py-3">{r.clock_out ? formatTime(r.clock_out) : <span className="text-green-500 font-medium">Active</span>}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === 'present' ? 'bg-green-100 text-green-700' : r.status === 'half_day' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
