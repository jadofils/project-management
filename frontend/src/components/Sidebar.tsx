import { Building2, Users, UserCog, Calendar, Clock, FileText, ChevronRight, Layers, FolderKanban, MessageSquare, BarChart3, Mail } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  children?: { id: string; label: string }[];
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'projects',
    label: 'Projects',
    icon: FolderKanban,
    children: [
      { id: 'board', label: 'Kanban Board' },
      { id: 'stats', label: 'Statistics' },
      { id: 'members', label: 'Members' },
      { id: 'chat', label: 'Chat' },
      { id: 'feedback', label: 'Feedback' },
    ],
  },
  {
    id: 'organization',
    label: 'Organization',
    icon: Building2,
    children: [
      { id: 'org-chart', label: 'Org Chart' },
      { id: 'divisions', label: 'Divisions' },
      { id: 'departments', label: 'Departments' },
      { id: 'positions', label: 'Job Positions' },
    ],
  },
  {
    id: 'people',
    label: 'People',
    icon: Users,
    children: [
      { id: 'employees', label: 'Directory' },
      { id: 'users', label: 'User Management' },
    ],
  },
  {
    id: 'attendance',
    label: 'Attendance',
    icon: Clock,
    children: [
      { id: 'today', label: "Today's Log" },
      { id: 'records', label: 'Records' },
      { id: 'report', label: 'Report' },
    ],
  },
  {
    id: 'leave',
    label: 'Leave',
    icon: Calendar,
    children: [
      { id: 'requests', label: 'Requests' },
      { id: 'balances', label: 'Balances' },
      { id: 'calendar', label: 'Team Calendar' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: FileText,
    children: [
      { id: 'attendance-report', label: 'Attendance' },
      { id: 'leave-report', label: 'Leave Summary' },
      { id: 'headcount', label: 'Headcount' },
    ],
  },
  {
    id: 'comms',
    label: 'Communications',
    icon: Mail,
    children: [
      { id: 'email-logs', label: 'Email Logs' },
      { id: 'invitations', label: 'Invitations' },
    ],
  },
];

interface Props {
  activeSection: string;
  onNavigate: (section: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ activeSection, onNavigate, collapsed, onToggle }: Props) {
  return (
    <div className={`h-full bg-white border-r flex flex-col shrink-0 transition-all duration-200 ${collapsed ? 'w-14' : 'w-56'}`}>
      <div className="px-4 py-4 border-b flex items-center justify-between">
        {!collapsed && (
          <span className="font-bold text-sm text-indigo-600 truncate">ProManager</span>
        )}
        <button onClick={onToggle} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
          <ChevronRight className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {NAV_ITEMS.map(group => {
          const isActive = activeSection.startsWith(group.id);
          const Icon = group.icon;
          return (
            <div key={group.id} className="mb-1">
              <button
                onClick={() => onNavigate(group.children?.[0]?.id || group.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{group.label}</span>}
                {!collapsed && group.children && (
                  <ChevronRight className={`w-3 h-3 ml-auto transition-transform ${isActive ? 'rotate-90' : ''}`} />
                )}
              </button>
              {!collapsed && isActive && group.children && (
                <div className="ml-7 mt-0.5 space-y-0.5">
                  {group.children.map(child => (
                    <button
                      key={child.id}
                      onClick={() => onNavigate(child.id)}
                      className={`w-full text-left px-2 py-1 text-xs rounded-lg transition-colors ${
                        activeSection === child.id ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!collapsed && (
        <div className="px-4 py-3 border-t text-[10px] text-gray-400">
          ProManager v1.0.0
        </div>
      )}
    </div>
  );
}
