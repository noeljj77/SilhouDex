import { Check, ChevronLeft, ChevronRight, Flag, Minus, X, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import {
  buildMonthCalendar,
  compareMonths,
  monthOf,
  shiftMonth,
  type CalendarDay,
  type DayStatus,
  type MonthRef,
} from '../../domain/progression/calendar.ts';
import type { DailyResults } from '../../domain/progression/streaks.ts';
import type { DateKey } from '../../lib/utcDate.ts';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const STATUS: Record<DayStatus, { text: string; icon?: LucideIcon; style: string }> = {
  won: { text: 'Won', icon: Check, style: 'border-ink bg-leaf text-white' },
  lost: { text: 'Lost', icon: X, style: 'border-ink bg-dex text-white' },
  gave_up: {
    text: 'Gave up',
    icon: Flag,
    style: 'border-ink bg-[#ff9a3c] text-ink',
  },
  missed: { text: 'Missed', icon: Minus, style: 'border-line bg-paper text-ink-soft' },
  today: { text: 'Today, not played yet', style: 'border-ink bg-volt text-ink' },
  future: { text: 'Upcoming', style: 'border-transparent text-ink-soft' },
  'before-start': { text: 'Before you started', style: 'border-transparent text-ink-soft' },
};

const LEGEND: DayStatus[] = ['won', 'lost', 'gave_up', 'missed', 'today'];

const monthName = ({ year, month }: MonthRef) =>
  new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

function describe(day: CalendarDay, month: MonthRef): string {
  const base = `${day.day} ${new Date(Date.UTC(month.year, month.month - 1, 1)).toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' })}: ${STATUS[day.status].text}`;
  return day.score !== undefined ? `${base}, ${day.score} points` : base;
}

/** A month of daily results, with arrows to move between months you can have played in. */
export function MonthCalendarView({
  results,
  today,
  startDate,
}: {
  results: DailyResults;
  today: DateKey;
  startDate: DateKey;
}) {
  const latest = monthOf(today);
  const earliestRaw = monthOf(startDate);
  const earliest = compareMonths(earliestRaw, latest) > 0 ? latest : earliestRaw;
  const [shown, setShown] = useState<MonthRef>(latest);

  const calendar = buildMonthCalendar({ ...shown, results, today, startDate });
  const canGoBack = compareMonths(shown, earliest) > 0;
  const canGoForward = compareMonths(shown, latest) < 0;

  return (
    <section aria-label="Calendar" className="dex-card !rounded-3xl p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          disabled={!canGoBack}
          onClick={() => setShown((m) => shiftMonth(m, -1))}
          className="grid size-10 place-items-center rounded-xl text-ink enabled:hover:bg-paper disabled:opacity-30"
        >
          <ChevronLeft size={20} aria-hidden />
        </button>
        <h3 className="font-display text-2xl text-ink" aria-live="polite">
          {monthName(shown)}
        </h3>
        <button
          type="button"
          aria-label="Next month"
          disabled={!canGoForward}
          onClick={() => setShown((m) => shiftMonth(m, 1))}
          className="grid size-10 place-items-center rounded-xl text-ink enabled:hover:bg-paper disabled:opacity-30"
        >
          <ChevronRight size={20} aria-hidden />
        </button>
      </div>

      <table className="w-full table-fixed border-separate border-spacing-1">
        <caption className="sr-only">Daily challenge results for {monthName(shown)}</caption>
        <thead>
          <tr>
            {WEEKDAYS.map((d) => (
              <th
                key={d}
                scope="col"
                className="pb-1 text-center text-xs font-semibold text-ink-soft"
              >
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {calendar.weeks.map((week, w) => (
            <tr key={w}>
              {week.map((day, i) => (
                <td key={i} className="p-0 text-center">
                  {day && <DayCell day={day} month={shown} />}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <ul
        className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-semibold text-ink-soft"
        aria-label="Legend"
      >
        {LEGEND.map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className={`size-4 rounded border-2 ${STATUS[s].style}`} />
            {STATUS[s].text.replace(', not played yet', '')}
          </li>
        ))}
      </ul>
    </section>
  );
}

function DayCell({ day, month }: { day: CalendarDay; month: MonthRef }) {
  const { icon: Icon, style } = STATUS[day.status];
  return (
    <div
      role="img"
      aria-label={describe(day, month)}
      title={describe(day, month)}
      className={`relative mx-auto flex aspect-square w-full max-w-12 items-center justify-center rounded-lg border-2 text-sm font-semibold ${style}`}
    >
      {Icon ? <Icon size={18} aria-hidden /> : <span aria-hidden>{day.day}</span>}
      {Icon && (
        <span aria-hidden className="absolute left-1 top-0.5 text-[0.6rem] font-medium opacity-70">
          {day.day}
        </span>
      )}
    </div>
  );
}
