import { Building2, Users, UserCog, Calendar, Clock, FileText, ChevronRight, Layers, FolderKanban, MessageSquare, BarChart3, Mail, Briefcase, Settings, User, Download, Share2, PenTool } from 'lucide-react';
import { useState, useEffect } from 'react';

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
    id: 'recruitment',
    label: 'Recruitment',
    icon: Briefcase,
    children: [
      { id: 'postings', label: 'Job Postings' },
      { id: 'applications', label: 'Applications' },
    ],
  },
  {
    id: 'comms',
    label: 'Communications',
    icon: Mail,
    children: [
      { id: 'email-logs', label: 'Email Logs' },
      { id: 'invitations', label: 'Invitations' },
      { id: 'send-mail', label: 'Send Email' },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    icon: PenTool,
    children: [
      { id: 'content-generate',   label: 'AI Generate' },
      { id: 'content-drafts',     label: 'Drafts' },
      { id: 'content-published',  label: 'Published' },
      { id: 'content-categories', label: 'Categories' },
      { id: 'content-analytics',  label: 'Analytics' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    children: [
      { id: 'profile', label: 'My Profile' },
    ],
  },
];

interface Props {
  activeSection: string;
  onNavigate: (section: string) => void;
  collapsed: boolean;
  onToggle: () => void;
  isAdmin: boolean;
}

export function Sidebar({ activeSection, onNavigate, collapsed, onToggle, isAdmin }: Props) {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => { setIsInstalled(true); setInstallPrompt(null); });
    if (window.matchMedia('(display-mode: standalone)').matches) setIsInstalled(true);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') { setIsInstalled(true); setInstallPrompt(null); }
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'ipfundo', text: 'Project management & team collaboration platform', url: window.location.origin });
    } else {
      await navigator.clipboard.writeText(window.location.origin);
      alert('Link copied to clipboard!');
    }
  };
  return (
    <div className={`h-full bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col shrink-0 transition-all duration-200 ${collapsed ? 'w-14' : 'w-56'}`}>
      <div className="px-4 py-4 border-b flex items-center justify-between">
        {!collapsed && (
          <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400 truncate">ipfundo</span>
        )}
        <button onClick={onToggle} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
          <ChevronRight className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {NAV_ITEMS.map(group => {
          const isActive = activeSection.startsWith(group.id);
          const Icon = group.icon;

          // Sections restricted to system admins only
          const adminOnly = ['organization', 'people', 'attendance', 'leave', 'reports', 'recruitment', 'comms', 'content'];
          if (adminOnly.includes(group.id) && !isAdmin) return null;

          return (
            <div key={group.id} className="mb-1">
              <button
                onClick={() => onNavigate(group.children?.[0]?.id || group.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
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
                        activeSection === child.id
                          ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-medium'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
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
        <div className="px-3 py-3 border-t dark:border-gray-700 space-y-2">
          {installPrompt && !isInstalled && (
            <button onClick={handleInstall}
              className="w-full flex items-center gap-2 px-2 py-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors">
              <Download className="w-3.5 h-3.5" />Install App
            </button>
          )}
          {isInstalled && (
            <button onClick={handleShare}
              className="w-full flex items-center gap-2 px-2 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <Share2 className="w-3.5 h-3.5" />Share ipfundo
            </button>
          )}
          <p className="text-[10px] text-gray-400 text-center">ipfundo v1.0</p>
        </div>
      )}
    </div>
  );
}
