import { useState, useEffect } from 'react';
import { Clock, QrCode, Phone, RefreshCw, Loader2, Info, Copy, ScanLine, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api, userName } from '../services/api';

export function AttendancePanel() {
  const [tab, setTab] = useState<'today' | 'records' | 'scanner' | 'how'>('today');
  const [today, setToday] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrData, setQrData] = useState<any>(null);

  // Scanner state
  const [scanInput, setScanInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

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
    try { const d = await api.generateAttendanceToken(); setQrData(d); toast.success('QR code generated — show to scanner'); } catch (e: any) { toast.error(e.message); }
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    const parts = scanInput.trim().split(':');
    if (parts.length < 3) { toast.error('Invalid QR format. Need token:hash or userId:minute:hash'); return; }

    const token = `${parts[0]}:${parts[1]}`;
    const hash = parts.slice(2).join(':');

    setScanning(true);
    setScanResult(null);
    try {
      const result = await api.scanAttendance({ token, hash });
      setScanResult(result);
      toast.success(`${result.action === 'clock_in' ? 'Clocked in' : 'Clocked out'} successfully`);
      loadToday();
    } catch (e: any) {
      setScanResult({ error: e.message });
      toast.error(e.message);
    } finally {
      setScanning(false);
      setScanInput('');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copied!')).catch(() => toast.error('Copy failed'));
  };

  useEffect(() => {
    if (tab === 'today') loadToday();
    else if (tab === 'records') loadRecords();
  }, [tab]);

  const formatTime = (d: string) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 max-w-5xl mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-5"><Clock className="w-5 h-5 text-indigo-500" />Attendance</h2>

      <div className="flex items-center gap-1 mb-4 border-b">
        {[
          { id: 'today', label: "Today's Log", icon: Clock },
          { id: 'records', label: 'Records', icon: Clock },
          { id: 'scanner', label: 'Scanner', icon: ScanLine },
          { id: 'how', label: 'How It Works', icon: Info },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`text-sm px-4 py-2 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${tab === t.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>}

      {/* Today's Log */}
      {tab === 'today' && today && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border p-4 text-center"><p className="text-2xl font-bold text-indigo-600">{today.total}</p><p className="text-xs text-gray-500">Total Today</p></div>
            <div className="bg-white rounded-xl border p-4 text-center"><p className="text-2xl font-bold text-green-600">{today.present.length}</p><p className="text-xs text-gray-500">Still In</p></div>
            <div className="bg-white rounded-xl border p-4 text-center"><p className="text-2xl font-bold text-blue-600">{today.completed}</p><p className="text-xs text-gray-500">Done</p></div>
          </div>

          {today.present.length > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Currently In Office</h3>
              <div className="space-y-2">
                {today.present.map((r: any) => (
                  <div key={r.id} className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="font-medium">{r.user ? userName(r.user) : r.user_id}</span>
                    <span className="text-gray-400 text-xs ml-auto">In since {formatTime(r.clock_in)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={generateQR} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
              <QrCode className="w-4 h-4" />Generate My QR
            </button>
            <button onClick={loadToday} className="flex items-center gap-2 px-4 py-2 border text-gray-600 rounded-xl text-sm hover:bg-gray-50"><RefreshCw className="w-4 h-4" />Refresh</button>
          </div>

          {qrData && (
            <div className="bg-white rounded-xl border p-5">
              <p className="text-sm font-semibold mb-3 text-center">Your QR Token</p>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs break-all mb-3">
                {qrData.token}:{qrData.hash}
              </div>
              <div className="flex items-center justify-between text-[10px] text-gray-400 mb-3">
                <span>Show this to the office scanner</span>
                <span>Expires: {new Date(qrData.expires_at).toLocaleTimeString()}</span>
              </div>
              <button onClick={() => copyToClipboard(`${qrData.token}:${qrData.hash}`)} className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 flex items-center justify-center gap-1">
                <Copy className="w-3 h-3" />Copy QR Token
              </button>
            </div>
          )}
        </div>
      )}

      {/* Scanner Tab */}
      {tab === 'scanner' && (
        <div className="bg-white rounded-xl border p-5 max-w-md mx-auto">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <ScanLine className="w-4 h-4 text-indigo-500" />Scan Employee QR
          </h3>
          <p className="text-xs text-gray-500 mb-4">Paste the QR token string shown on the employee's device.</p>
          <form onSubmit={handleScan} className="space-y-3">
            <input
              value={scanInput}
              onChange={e => setScanInput(e.target.value)}
              placeholder="userId:timestamp:hash"
              className="w-full px-3 py-2.5 border rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-300 outline-none"
              autoFocus
            />
            <button type="submit" disabled={scanning || !scanInput.trim()} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}Scan & Record
            </button>
          </form>
          {scanResult && (
            <div className={`mt-4 p-3 rounded-xl text-sm ${scanResult.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {scanResult.error ? (
                <div className="flex items-center gap-2"><XCircle className="w-4 h-4" />{scanResult.error}</div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span><strong>{scanResult.action === 'clock_in' ? 'CLOCK IN' : 'CLOCK OUT'}</strong> recorded for {scanResult.user_id}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Records */}
      {tab === 'records' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase"><th className="text-left px-4 py-3">User</th><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Clock In</th><th className="text-left px-4 py-3">Clock Out</th><th className="text-left px-4 py-3">Method</th><th className="text-left px-4 py-3">Status</th></tr></thead>
            <tbody className="divide-y">
              {records.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.user ? userName(r.user) : r.user_id}</td>
                  <td className="px-4 py-3 text-gray-500">{r.date}</td>
                  <td className="px-4 py-3">{r.clock_in ? formatTime(r.clock_in) : '—'}</td>
                  <td className="px-4 py-3">{r.clock_out ? formatTime(r.clock_out) : <span className="text-green-500 font-medium">Active</span>}</td>
                  <td className="px-4 py-3"><span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-gray-100 text-gray-600 uppercase">{r.method}</span></td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === 'present' ? 'bg-green-100 text-green-700' : r.status === 'half_day' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>{r.status}</span></td>
                </tr>
              ))}
              {records.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">No records yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* How It Works */}
      {tab === 'how' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-5">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-4"><Info className="w-4 h-4 text-indigo-500" />How Attendance Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-indigo-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3"><span className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">1</span><span className="font-semibold text-sm text-indigo-700">QR Code Scan</span></div>
                <ol className="text-xs text-gray-600 space-y-1.5 list-decimal pl-4">
                  <li><strong>Employee</strong> clicks <strong>Generate My QR</strong> on their phone in the Today tab</li>
                  <li>A <strong>unique HMAC token</strong> is created — linked to their user ID and current minute</li>
                  <li>Token is <strong>valid for 90 seconds</strong> and changes every minute</li>
                  <li>Employee shows the QR code (or copies the token string) to the <strong>office scanner/admin</strong></li>
                  <li>Admin opens the <strong>Scanner</strong> tab, pastes the token, clicks <strong>Scan & Record</strong></li>
                  <li>System verifies: correct HMAC · not expired · not already used · office geofence</li>
                  <li>First scan of the day = <strong>clock in</strong>. Second scan = <strong>clock out</strong></li>
                </ol>
              </div>
              <div className="bg-amber-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3"><span className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center text-white text-xs font-bold">2</span><span className="font-semibold text-sm text-amber-700">Phone Call (IVR)</span></div>
                <ol className="text-xs text-gray-600 space-y-1.5 list-decimal pl-4">
                  <li>Employee <strong>calls the company attendance number</strong> from their registered phone</li>
                  <li>System identifies caller by <strong>phone number</strong> (must match Employee Profile)</li>
                  <li>IVR voice prompt: "Press <strong>1</strong> to clock in, Press <strong>2</strong> to clock out"</li>
                  <li>Attendance recorded with <strong>method: call</strong></li>
                  <li>Works on any phone — no smartphone or app required</li>
                  <li>Caller ID verified against <strong>EmployeeProfile.phone</strong> in the database</li>
                </ol>
                <div className="mt-3 pt-3 border-t border-amber-200">
                  <p className="text-[10px] text-amber-600 font-medium">Webhook URL (Twilio / Africa's Talking):</p>
                  <code className="text-[10px] bg-amber-100 px-2 py-1 rounded block mt-1 break-all">POST https://project-manager-api.onrender.com/api/attendance/ivr</code>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t space-y-2 text-xs text-gray-400">
              <p><strong>Security:</strong> QR tokens use HMAC-SHA256 with server-side secret — cannot be forged. Each token is <strong>one-time-use</strong> and expires in 90 seconds.</p>
              <p><strong>Geofence:</strong> Scanner device must be within configured office GPS radius (e.g., 100m). Configurable per office via <code>POST /api/attendance/offices</code>.</p>
              <p><strong>Status calculation:</strong> ≥8 hours = Present · 4-8 hours = Half Day · &lt;4 hours = Absent.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
