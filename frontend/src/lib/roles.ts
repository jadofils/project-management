export interface RoleDef {
  value: string;
  label: string;
  badge: string;
  dot: string;
}

export interface RoleCategory {
  label: string;
  roles: RoleDef[];
}

export const ROLE_CATEGORIES: RoleCategory[] = [
  {
    label: 'Management',
    roles: [
      { value: 'project_manager', label: 'Project Manager',   badge: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
    ],
  },
  {
    label: 'Development',
    roles: [
      { value: 'backend_dev',  label: 'Backend Developer',  badge: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500' },
      { value: 'frontend_dev', label: 'Frontend Developer', badge: 'bg-cyan-100 text-cyan-700',     dot: 'bg-cyan-500' },
      { value: 'db_engineer',  label: 'Database Engineer',  badge: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
    ],
  },
  {
    label: 'Quality & Review',
    roles: [
      { value: 'tester',    label: 'Tester',    badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
      { value: 'qa_tester', label: 'QA Tester', badge: 'bg-red-100 text-red-700',       dot: 'bg-red-500' },
      { value: 'reviewer',  label: 'Reviewer',  badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
    ],
  },
  {
    label: 'Documentation & Analysis',
    roles: [
      { value: 'documentalist', label: 'Documentalist', badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
      { value: 'analyst',       label: 'Analyst',       badge: 'bg-teal-100 text-teal-700',   dot: 'bg-teal-500' },
    ],
  },
];

export const ALL_ROLES: RoleDef[] = ROLE_CATEGORIES.flatMap(c => c.roles);
export const ROLE_MAP: Record<string, RoleDef> = Object.fromEntries(ALL_ROLES.map(r => [r.value, r]));

export function getRoleDef(value: string): RoleDef {
  return ROLE_MAP[value] || { value, label: value, badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };
}

export const PHASES = [
  { value: 'backend',        label: 'Backend',        roles: ['backend_dev'] },
  { value: 'frontend',       label: 'Frontend',       roles: ['frontend_dev'] },
  { value: 'documentation',  label: 'Documentation',  roles: ['documentalist'] },
  { value: 'qa_testing',     label: 'QA Testing',     roles: ['qa_tester', 'tester'] },
  { value: 'analysis',       label: 'Analysis',       roles: ['analyst'] },
  { value: 'db_engineering', label: 'DB Engineering', roles: ['db_engineer'] },
];

export const PHASE_SHORT: Record<string, string> = {
  backend:        'BE',
  frontend:       'FE',
  documentation:  'Doc',
  qa_testing:     'QA',
  analysis:       'Ana',
  db_engineering: 'DB',
};
