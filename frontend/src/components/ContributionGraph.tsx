import { useMemo, useState } from 'react';

export interface ContributionDay {
  date: string;   // 'YYYY-MM-DD'
  count: number;
  tasks: {
    id: string;
    title: string;
    project_id: string;
    project_name: string;
    completed_by: string | null;
    confirmed_by_name: string | null;
  }[];
}

interface Props {
  data: ContributionDay[];
  year?: number;
  label?: string;
  compact?: boolean;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS   = ['','Mon','','Wed','','Fri',''];

function levelColor(count: number, compact = false) {
  const base = compact ? 'h-2 w-2' : 'h-3 w-3';
  if (count === 0) return `${base} bg-gray-100 rounded-sm`;
  if (count === 1) return `${base} bg-green-200 rounded-sm`;
  if (count <= 3)  return `${base} bg-green-400 rounded-sm`;
  if (count <= 6)  return `${base} bg-green-600 rounded-sm`;
  return `${base} bg-green-800 rounded-sm`;
}

export function ContributionGraph({ data, year, label, compact = false }: Props) {
  const [tooltip, setTooltip] = useState<{ day: ContributionDay; x: number; y: number } | null>(null);

  const targetYear = year || new Date().getFullYear();

  // Build a full 365-day map for the year
  const dayMap = useMemo(() => {
    const m: Record<string, ContributionDay> = {};
    for (const d of data) m[d.date] = d;
    return m;
  }, [data]);

  // Build the weeks grid starting from Jan 1 of targetYear
  const weeks = useMemo(() => {
    const start = new Date(`${targetYear}-01-01`);
    // Shift back to Sunday
    const dayOfWeek = start.getDay(); // 0=Sun
    start.setDate(start.getDate() - dayOfWeek);

    const end = new Date(`${targetYear}-12-31`);
    const endDayOfWeek = end.getDay();
    end.setDate(end.getDate() + (6 - endDayOfWeek));

    const allWeeks: { date: Date; dateStr: string; inYear: boolean }[][] = [];
    let cur = new Date(start);
    while (cur <= end) {
      const week: { date: Date; dateStr: string; inYear: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = cur.toISOString().slice(0, 10);
        week.push({ date: new Date(cur), dateStr, inYear: cur.getFullYear() === targetYear });
        cur.setDate(cur.getDate() + 1);
      }
      allWeeks.push(week);
    }
    return allWeeks;
  }, [targetYear]);

  // Month label positions (week index where month starts)
  const monthLabels = useMemo(() => {
    const labels: { label: string; weekIdx: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      const m = week[0].date.getMonth();
      if (m !== lastMonth && week[0].inYear) {
        labels.push({ label: MONTHS[m], weekIdx: wi });
        lastMonth = m;
      }
    });
    return labels;
  }, [weeks]);

  const totalContributions = data.reduce((s, d) => s + d.count, 0);

  const cellSize = compact ? 8 : 12;
  const gap      = compact ? 1 : 2;

  return (
    <div className="select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        {label && <p className="text-xs font-semibold text-gray-600">{label}</p>}
        <p className="text-xs text-gray-400 ml-auto">
          <span className="font-semibold text-gray-600">{totalContributions}</span> contributions in {targetYear}
        </p>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="relative inline-block">
          {/* Month labels */}
          <div className={`flex mb-1 ${compact ? 'ml-0' : 'ml-7'}`}>
            {monthLabels.map((ml, i) => (
              <div
                key={i}
                className="text-[10px] text-gray-400 absolute"
                style={{ left: compact ? ml.weekIdx * (cellSize + gap) : 28 + ml.weekIdx * (cellSize + gap) }}
              >
                {ml.label}
              </div>
            ))}
            <div style={{ height: compact ? 12 : 14 }} />
          </div>

          {/* Grid */}
          <div className="flex gap-[2px]">
            {/* Day labels */}
            {!compact && (
              <div className="flex flex-col gap-[2px] mr-1">
                {DAYS.map((d, i) => (
                  <div key={i} className="text-[10px] text-gray-300 leading-none flex items-center"
                    style={{ height: cellSize + gap, lineHeight: `${cellSize}px` }}>
                    {d}
                  </div>
                ))}
              </div>
            )}

            {/* Weeks */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[2px]">
                {week.map((day, di) => {
                  const entry  = dayMap[day.dateStr];
                  const count  = (day.inYear && entry) ? entry.count : 0;
                  const inYear = day.inYear;
                  return (
                    <div
                      key={di}
                      className={`${levelColor(count, compact)} cursor-default transition-opacity ${!inYear ? 'opacity-0' : ''}`}
                      style={{ width: cellSize, height: cellSize }}
                      onMouseEnter={e => {
                        if (!inYear) return;
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setTooltip({ day: entry || { date: day.dateStr, count: 0, tasks: [] }, x: rect.left, y: rect.top });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          {!compact && (
            <div className="flex items-center gap-1 mt-2 justify-end">
              <span className="text-[10px] text-gray-400">Less</span>
              {[0, 1, 2, 4, 7].map(n => (
                <div key={n} className={levelColor(n)} style={{ width: cellSize, height: cellSize }} />
              ))}
              <span className="text-[10px] text-gray-400">More</span>
            </div>
          )}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 pointer-events-none shadow-xl max-w-xs"
          style={{ left: tooltip.x + 18, top: tooltip.y - 8 }}
        >
          <p className="font-semibold mb-1">
            {tooltip.day.count > 0
              ? `${tooltip.day.count} task${tooltip.day.count > 1 ? 's' : ''} completed`
              : 'No contributions'}
          </p>
          <p className="text-gray-400 text-[10px] mb-1.5">
            {new Date(tooltip.day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          {tooltip.day.tasks.slice(0, 5).map(t => (
            <div key={t.id} className="flex flex-col mb-1">
              <span className="text-gray-100 leading-snug">{t.title}</span>
              <span className="text-gray-400 text-[10px]">
                {t.project_name}
                {t.confirmed_by_name ? ` · ✓ ${t.confirmed_by_name}` : ''}
              </span>
            </div>
          ))}
          {tooltip.day.tasks.length > 5 && (
            <p className="text-gray-500 text-[10px] mt-1">+{tooltip.day.tasks.length - 5} more</p>
          )}
        </div>
      )}
    </div>
  );
}
