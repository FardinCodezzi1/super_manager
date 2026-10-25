import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useMess } from '../../context/MessContext';

export function MonthSwitcher() {
  const {
    currentMonthKey,
    setCurrentMonthKey,
    actualCurrentMonthKey,
    isPastMonth,
    isCurrentMonth,
    isFutureMonth,
    months,
  } = useMess();

  const formatMonthName = (key) => {
    if (!key || !key.includes('-')) return key;
    const [year, month] = key.split('-');
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Compile list of available months (database records + current month)
  const selectableMonths = useMemo(() => {
    const set = new Set();
    // Add all months from messMonth database records
    (months || []).forEach((m) => {
      if (m.monthKey) set.add(m.monthKey);
    });
    // Ensure actual current calendar month is always present
    if (actualCurrentMonthKey) set.add(actualCurrentMonthKey);
    // Ensure currently selected month is present
    if (currentMonthKey) set.add(currentMonthKey);

    return Array.from(set).sort().reverse(); // Newest first
  }, [months, actualCurrentMonthKey, currentMonthKey]);

  const handlePrevMonth = () => {
    const [yearStr, monthStr] = currentMonthKey.split('-');
    const y = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10);
    const prevDate = new Date(y, m - 2, 1);
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonthKey(prevKey);
  };

  const handleNextMonth = () => {
    const [yearStr, monthStr] = currentMonthKey.split('-');
    const y = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10);
    const nextDate = new Date(y, m, 1);
    const nextKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonthKey(nextKey);
  };

  return (
    <div className="surface-card flex items-center justify-between gap-1.5 py-1.5 px-2.5">
      {/* Prev Month Button */}
      <button
        type="button"
        onClick={handlePrevMonth}
        className="tap-active p-1 text-DynamicSec hover:text-DynamicMain sharp-xs flex items-center gap-0.5 text-xs font-bold"
        title="View Previous Month"
      >
        <ChevronLeft className="w-4 h-4 text-indigo-400" />
        <span className="hidden sm:inline text-[11px]">Prev</span>
      </button>

      {/* Center: Dropdown & Status Badge */}
      <div className="flex items-center gap-1.5 min-w-0">
        <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        
        <select
          value={currentMonthKey}
          onChange={(e) => setCurrentMonthKey(e.target.value)}
          className="surface-input px-2 py-1 text-xs font-bold sharp-xs text-DynamicMain border cursor-pointer max-w-[130px] sm:max-w-none truncate"
          title="Switch Month"
        >
          {selectableMonths.map((mKey) => (
            <option key={mKey} value={mKey}>
              {formatMonthName(mKey)} {mKey === actualCurrentMonthKey ? '(Current)' : ''}
            </option>
          ))}
        </select>

        {/* Dynamic Status Badges */}
        {isCurrentMonth && (
          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 sharp-xs whitespace-nowrap">
            Active
          </span>
        )}

        {isPastMonth && (
          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 sharp-xs whitespace-nowrap">
            Archived
          </span>
        )}

        {isFutureMonth && (
          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 sharp-xs whitespace-nowrap">
            Upcoming
          </span>
        )}
      </div>

      {/* Next Month Button */}
      <button
        type="button"
        onClick={handleNextMonth}
        className="tap-active p-1 text-DynamicSec hover:text-DynamicMain sharp-xs flex items-center gap-0.5 text-xs font-bold"
        title="View Next Month"
      >
        <span className="hidden sm:inline text-[11px]">Next</span>
        <ChevronRight className="w-4 h-4 text-indigo-400" />
      </button>
    </div>
  );
}
