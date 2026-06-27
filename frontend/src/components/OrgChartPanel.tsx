import { useState, useEffect } from 'react';
import { Building2, Users, Loader2, ChevronDown, ChevronRight, Plus, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, userName, userInitials } from '../services/api';

function OrgNode({ div, onRefresh }: { div: any; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="ml-0">
      <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-gray-50 w-full text-left">
        <ChevronRight className={`w-4 h-4 transition-transform text-gray-400 ${expanded ? 'rotate-90' : ''}`} />
        <Building2 className="w-4 h-4 text-indigo-500" />
        <span className="font-semibold text-gray-800">{div.name}</span>
        <span className="text-[10px] text-gray-400">{div.code}</span>
        <span className="ml-auto text-[10px] text-gray-400">{div.departments?.length || 0} depts</span>
      </button>
      {expanded && div.departments?.map((dept: any) => (
        <DepartmentNode key={dept.id} dept={dept} />
      ))}
    </div>
  );
}

function DepartmentNode({ dept }: { dept: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="ml-6">
      <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 w-full text-left text-sm">
        <ChevronRight className={`w-3 h-3 transition-transform text-gray-400 ${expanded ? 'rotate-90' : ''}`} />
        <Users className="w-3.5 h-3.5 text-amber-500" />
        <span className="font-medium text-gray-700">{dept.name}</span>
        <span className="ml-auto text-[10px] text-gray-400">{dept.employees?.length || 0} people</span>
      </button>
      {expanded && dept.employees?.map((emp: any) => (
        <div key={emp.id} className="ml-8 flex items-center gap-2 py-1.5 text-sm text-gray-600">
          {emp.user?.avatar_url
            ? <img src={emp.user.avatar_url} className="w-5 h-5 rounded-full" alt="" />
            : <div className="w-5 h-5 rounded-full bg-indigo-400 flex items-center justify-center text-white text-[8px] font-bold">{emp.user ? userInitials(emp.user) : '?'}</div>}
          <span>{emp.user ? userName(emp.user) : emp.user_id}</span>
          {emp.job_position_id && <span className="text-[10px] text-gray-400">{emp.job_position_id}</span>}
        </div>
      ))}
    </div>
  );
}

export function OrgChartPanel() {
  const [chart, setChart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'chart' | 'employees'>('chart');
  const [employees, setEmployees] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try { setChart(await api.getOrgChart()); } catch { toast.error('Failed to load org chart'); }
    try { setEmployees(await api.getEmployees()); } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>;

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 max-w-4xl mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-5"><Building2 className="w-5 h-5 text-indigo-500" />Organization</h2>

      <div className="flex items-center gap-1 mb-4 border-b">
        {[{ id: 'chart', label: 'Org Chart' }, { id: 'employees', label: 'Directory' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`text-sm px-4 py-2 font-medium border-b-2 transition-colors ${tab === t.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'chart' && (
        <div className="bg-white rounded-xl border p-4 space-y-1">
          {chart.length === 0 ? <p className="text-center py-8 text-gray-400">No divisions set up yet</p>
            : chart.map(div => <OrgNode key={div.id} div={div} onRefresh={load} />)}
        </div>
      )}

      {tab === 'employees' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase"><th className="text-left px-4 py-3">Employee</th><th className="text-left px-4 py-3">Email</th><th className="text-left px-4 py-3">Phone</th><th className="text-left px-4 py-3">Hire Date</th></tr></thead>
            <tbody className="divide-y">
              {employees.map((emp: any) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{emp.user ? userName(emp.user) : emp.user_id}</td>
                  <td className="px-4 py-3 text-gray-500">{emp.user?.email || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{emp.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{emp.hire_date || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
