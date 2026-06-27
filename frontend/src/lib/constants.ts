export const COLUMNS: { id: string; label: string; color: string; headerColor: string }[] = [
  { id: 'todo',        label: 'To Do',       color: 'bg-gray-50',    headerColor: 'bg-gray-200 text-gray-700' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-50',    headerColor: 'bg-blue-200 text-blue-700' },
  { id: 'review',      label: 'Review',      color: 'bg-amber-50',   headerColor: 'bg-amber-200 text-amber-700' },
  { id: 'rework',      label: 'Rework',      color: 'bg-red-50',     headerColor: 'bg-red-200 text-red-700' },
  { id: 'done',        label: 'Done',        color: 'bg-green-50',   headerColor: 'bg-green-200 text-green-700' },
];

export const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high:     'bg-orange-100 text-orange-700',
  medium:   'bg-yellow-100 text-yellow-700',
  low:      'bg-green-100 text-green-700',
};
