import { FileText, Download, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';
const token = () => localStorage.getItem('accessToken') || '';

async function download(url: string, filename: string) {
  try {
    const res = await fetch(`${API}${url}`, { headers: { Authorization: `Bearer ${token()}` } });
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    toast.success(`Downloaded ${filename}`);
  } catch { toast.error('Download failed'); }
}

const REPORTS = [
  { icon: FileText, label: 'Attendance Report', desc: 'CSV of all clock in/out records with hours and status', url: '/reports/attendance', file: 'attendance.csv' },
  { icon: FileText, label: 'Leave Balance Summary', desc: 'CSV per employee — allocated, used, remaining days', url: '/reports/leave', file: 'leave-balances.csv' },
  { icon: FileText, label: 'Division Headcount', desc: 'CSV breakdown of active employees per division/department', url: '/reports/headcount', file: 'headcount.csv' },
  { icon: FileText, label: 'Task Completion Report', desc: 'CSV of all tasks with status, assignee, and on-time tracking', url: '/reports/tasks', file: 'tasks.csv' },
  { icon: Calendar, label: 'Leave Calendar (.ics)', desc: 'iCalendar file of all approved leave for Google/Outlook import', url: '/reports/calendar', file: 'leave-calendar.ics' },
];

export function ReportsPanel() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handle = async (r: typeof REPORTS[0]) => {
    setDownloading(r.label);
    await download(r.url, r.file);
    setDownloading(null);
  };

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 max-w-3xl mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-5"><FileText className="w-5 h-5 text-indigo-500" />Reports & Exports</h2>
      <div className="space-y-3">
        {REPORTS.map(r => (
          <div key={r.label} className="bg-white rounded-xl border p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0"><r.icon className="w-5 h-5 text-indigo-500" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{r.label}</p>
              <p className="text-xs text-gray-400">{r.desc}</p>
            </div>
            <button onClick={() => handle(r)} disabled={downloading === r.label}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5">
              {downloading === r.label ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}Export
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
