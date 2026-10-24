import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { PauseCircle, Minus, Plus, Lock, CheckCircle2 } from 'lucide-react';
import { useMess } from '../../context/MessContext';
import { useAuth } from '../../context/AuthContext';
import { mealService } from '../../services/mealService';
import { showToast } from '../common/Toast';
import { ConfirmModal } from '../common/ConfirmModal';

export function DailyMealsView({ onOpenLeaveBreak }) {
  const { currentMonthKey, members, isManager, activeMemberId, refreshAllMessData } = useMess();
  const { currentUser } = useAuth();

  const getTodayDateString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = getTodayDateString();
    if (today.startsWith(currentMonthKey)) return today;
    return `${currentMonthKey}-01`;
  });

  const [mealsData, setMealsData] = useState([]);
  const [approvedLeaves, setApprovedLeaves] = useState([]);
  const carouselRef = useRef(null);

  // Resume Meals Confirm Modal State
  const [resumingMember, setResumingMember] = useState(null);
  const [isResuming, setIsResuming] = useState(false);

  // Generate calendar days for currentMonthKey
  const monthDates = useMemo(() => {
    const [yearStr, monthStr] = currentMonthKey.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();

    const days = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dateObj = new Date(year, month - 1, day);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      days.push({ dateStr, dayNumber: day, dayName });
    }
    return days;
  }, [currentMonthKey]);

  // Fetch meals and approved breaks for currentMonthKey
  const fetchMeals = useCallback(async () => {
    try {
      const [mealsRes, leavesRes] = await Promise.all([
        mealService.getMeals({ monthKey: currentMonthKey }).catch(() => ({ meals: [] })),
        mealService.getLeaveRequests().catch(() => ({ leaveRequests: [] })),
      ]);
      const rawMeals = mealsRes?.meals || [];
      const rawLeaves = (leavesRes?.leaveRequests || []).filter((l) => l.status === 'APPROVED');
      setMealsData(rawMeals);
      setApprovedLeaves(rawLeaves);
    } catch (err) {
      showToast(err.message || 'Failed to load meals', 'error');
    }
  }, [currentMonthKey]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  // Jump to Today
  const handleJumpToday = () => {
    const today = getTodayDateString();
    if (today.startsWith(currentMonthKey)) {
      setSelectedDate(today);
    } else {
      setSelectedDate(`${currentMonthKey}-01`);
    }
  };

  // Scroll active date into view
  useEffect(() => {
    if (carouselRef.current) {
      const activeEl = carouselRef.current.querySelector('.date-pill-active');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [selectedDate]);

  // Meals for currently selected date
  const selectedDateMealsMap = useMemo(() => {
    const map = new Map();
    for (const m of mealsData) {
      const dStr = m.date.split('T')[0];
      if (dStr === selectedDate) {
        map.set(m.memberId, m);
      }
    }
    return map;
  }, [mealsData, selectedDate]);

  // Calculate day total
  const dayTotalMeals = useMemo(() => {
    let sum = 0;
    for (const m of selectedDateMealsMap.values()) {
      sum += (Number(m.lunch) || 0) + (Number(m.dinner) || 0);
    }
    return sum;
  }, [selectedDateMealsMap]);

  // Add / Subtract 0.5 for lunch or dinner
  const handleStepMeal = async (memberId, mealType, step) => {
    if (!isManager) {
      showToast('Only the current mess manager can record daily meals', 'error');
      return;
    }

    const currentRecord = selectedDateMealsMap.get(memberId) || { lunch: 0, dinner: 0, isLeave: false };
    const hasApprovedLeave = approvedLeaves.some((l) => {
      const matchesMember = l.memberId === memberId || l.member?.id === memberId;
      if (!matchesMember) return false;
      const start = l.startDate.split('T')[0];
      const end = l.endDate.split('T')[0];
      return selectedDate >= start && selectedDate <= end;
    });

    if (currentRecord.isLeave || hasApprovedLeave) {
      showToast('Member is currently on break for this date. Meal entry is locked.', 'warning');
      return;
    }

    const curVal = Number(currentRecord[mealType]) || 0;
    let nextVal = Math.round((curVal + step) * 10) / 10;
    if (nextVal < 0) nextVal = 0;

    const newLunch = mealType === 'lunch' ? nextVal : (Number(currentRecord.lunch) || 0);
    const newDinner = mealType === 'dinner' ? nextVal : (Number(currentRecord.dinner) || 0);

    // Optimistic update
    setMealsData((prev) => {
      const remaining = prev.filter(
        (m) => !(m.memberId === memberId && m.date.split('T')[0] === selectedDate)
      );
      return [
        ...remaining,
        {
          ...currentRecord,
          memberId,
          date: `${selectedDate}T00:00:00.000Z`,
          lunch: newLunch,
          dinner: newDinner,
        },
      ];
    });

    try {
      await mealService.recordMeal({
        date: selectedDate,
        memberId,
        lunch: newLunch,
        dinner: newDinner,
        isLeave: false,
      });
      refreshAllMessData();
    } catch (err) {
      showToast(err.message || 'Failed to update meal', 'error');
      fetchMeals();
    }
  };

  const handleConfirmResumeMeals = async () => {
    if (!resumingMember) return;
    setIsResuming(true);
    try {
      await mealService.recordMeal({
        date: selectedDate,
        memberId: resumingMember.id,
        lunch: 0,
        dinner: 0,
        isLeave: false,
      });

      showToast(`Meals resumed for ${resumingMember.user?.name || 'member'}!`, 'success');
      setResumingMember(null);
      await Promise.all([fetchMeals(), refreshAllMessData()]);
    } catch (err) {
      showToast(err.message || 'Failed to resume meals', 'error');
    } finally {
      setIsResuming(false);
    }
  };

  const formatMealValue = (val) => {
    const num = Number(val) || 0;
    return num % 1 === 0 ? num.toString() : num.toFixed(1);
  };

  return (
    <div className="space-y-2.5">
      {/* Date Carousel Header */}
      <div className="surface-card space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-bold text-DynamicSec uppercase tracking-wider">
              Daily Meal Entry
            </h2>
            <p className="text-xs text-DynamicMuted mt-0.5">
              {isManager
                ? 'Manager Duty: Click + / - to step by 0.5'
                : 'Members: Read-only daily view'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenLeaveBreak}
              className="tap-active px-2 py-1 surface-subtle sharp-xs text-xs font-semibold text-DynamicMain hover:border-indigo-500 transition flex items-center gap-1 whitespace-nowrap"
              title="Temporary Meal Break (Pause Meals)"
            >
              <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Meal Break</span>
            </button>
            <button
              type="button"
              onClick={handleJumpToday}
              className="tap-active px-2 py-1 theme-bg-soft border sharp-xs text-xs font-bold transition whitespace-nowrap"
            >
              Jump Today
            </button>
          </div>
        </div>

        {/* Horizontal Dates Carousel */}
        <div ref={carouselRef} className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1">
          {monthDates.map((d) => {
            const isSelected = d.dateStr === selectedDate;
            const isToday = d.dateStr === getTodayDateString();

            return (
              <button
                key={d.dateStr}
                type="button"
                onClick={() => setSelectedDate(d.dateStr)}
                className={`tap-active px-2.5 py-1.5 sharp-xs flex flex-col items-center justify-center min-w-[42px] shrink-0 border transition ${
                  isSelected
                    ? 'date-pill-active theme-btn-primary border-transparent'
                    : 'surface-subtle border-slate-700/40 text-DynamicSec hover:border-slate-500'
                }`}
              >
                <span className={`text-[9px] uppercase font-bold ${isSelected ? 'text-white/80' : 'text-DynamicMuted'}`}>
                  {d.dayName}
                </span>
                <span className="text-xs font-extrabold">{d.dayNumber}</span>
                {isToday && (
                  <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-indigo-400'}`}></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-DynamicMain">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </span>
          <span className="px-1.5 py-0.5 sharp-xs text-[10px] font-bold theme-bg-soft border">
            {dayTotalMeals.toFixed(1)} Meals
          </span>
        </div>

        {!isManager && (
          <span className="flex items-center gap-1 text-[10px] text-DynamicMuted">
            <Lock className="w-3 h-3 text-DynamicMuted" />
            <span>Manager controls</span>
          </span>
        )}
      </div>

      {/* Daily Meal Bars List matching Screenshot 1 */}
      <div className="space-y-2">
        {members
          .filter((m) => m.status === 'ACTIVE')
          .map((member) => {
            const record = selectedDateMealsMap.get(member.id) || { lunch: 0, dinner: 0, isLeave: false };
            const lunchVal = Number(record.lunch) || 0;
            const dinnerVal = Number(record.dinner) || 0;
            const totalVal = lunchVal + dinnerVal;
            const initial = member.user?.name ? member.user.name.trim()[0].toUpperCase() : 'M';

            // Dual-layer break verification: check daily record and active approved leave requests
            const hasApprovedLeave = approvedLeaves.some((l) => {
              const matchesMember = l.memberId === member.id || l.member?.id === member.id;
              if (!matchesMember) return false;
              const start = l.startDate.split('T')[0];
              const end = l.endDate.split('T')[0];
              return selectedDate >= start && selectedDate <= end;
            });
            const isLeave = Boolean(record.isLeave) || hasApprovedLeave;
            const canResume = isManager || member.id === activeMemberId || member.userId === currentUser?.id;

            return (
              <div
                key={member.id}
                className={`surface-card p-3 sharp-xs space-y-2.5 border transition ${
                  isLeave
                    ? 'border-amber-500/40 bg-amber-500/5'
                    : 'border-slate-800/90'
                }`}
              >
                {/* Top Row: Avatar Initial, Name, and Total */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 sharp-xs theme-btn-primary flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs">
                      {initial}
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-DynamicMain truncate">
                      {member.user?.name || 'Member'}
                    </span>
                    {member.role === 'MANAGER' && (
                      <span className="px-1 py-0.2 sharp-xs text-[9px] font-bold theme-bg-soft border shrink-0">
                        MANAGER
                      </span>
                    )}

                    {/* Prominent ON BREAK Badge */}
                    {isLeave && (
                      <span className="px-1.5 py-0.5 text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 sharp-xs font-bold shrink-0">
                        ON BREAK
                      </span>
                    )}

                    {/* Resume Meals Early button if on break */}
                    {isLeave && canResume && (
                      <button
                        type="button"
                        onClick={() => setResumingMember(member)}
                        className="tap-active text-[10px] font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-2 flex items-center gap-0.5 shrink-0"
                        title="Member returned early: click to resume meals"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Resume Meals</span>
                      </button>
                    )}
                  </div>

                  <span className="text-xs font-extrabold theme-text-primary shrink-0">
                    Total: {totalVal.toFixed(1)}
                  </span>
                </div>

                {/* Bottom Row: Side-by-side Lunch & Dinner Bars */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Lunch Box */}
                  <div className={`surface-subtle px-2.5 py-1.5 sharp-xs flex items-center justify-between border ${
                    isLeave ? 'border-amber-500/20 opacity-70' : 'border-slate-800'
                  }`}>
                    <span className="text-xs font-semibold text-DynamicMain">Lunch</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={!isManager || isLeave || lunchVal <= 0}
                        onClick={() => handleStepMeal(member.id, 'lunch', -0.5)}
                        className={`w-6 h-6 sharp-xs surface-card border border-slate-700 font-extrabold text-xs flex items-center justify-center transition ${
                          isManager && !isLeave && lunchVal > 0
                            ? 'tap-active text-DynamicMain hover:bg-slate-700'
                            : 'opacity-30 cursor-not-allowed text-DynamicMuted'
                        }`}
                        title={isLeave ? 'Disabled (On Break)' : 'Subtract 0.5'}
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <span className="font-extrabold text-xs text-DynamicMain min-w-[20px] text-center">
                        {formatMealValue(lunchVal)}
                      </span>

                      <button
                        type="button"
                        disabled={!isManager || isLeave}
                        onClick={() => handleStepMeal(member.id, 'lunch', 0.5)}
                        className={`w-6 h-6 sharp-xs font-extrabold text-xs flex items-center justify-center transition ${
                          isManager && !isLeave
                            ? 'tap-active theme-btn-primary hover:brightness-110 shadow-xs'
                            : 'opacity-30 cursor-not-allowed surface-card border border-slate-700 text-DynamicMuted'
                        }`}
                        title={isLeave ? 'Disabled (On Break)' : 'Add 0.5'}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Dinner Box */}
                  <div className={`surface-subtle px-2.5 py-1.5 sharp-xs flex items-center justify-between border ${
                    isLeave ? 'border-amber-500/20 opacity-70' : 'border-slate-800'
                  }`}>
                    <span className="text-xs font-semibold text-DynamicMain">Dinner</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={!isManager || isLeave || dinnerVal <= 0}
                        onClick={() => handleStepMeal(member.id, 'dinner', -0.5)}
                        className={`w-6 h-6 sharp-xs surface-card border border-slate-700 font-extrabold text-xs flex items-center justify-center transition ${
                          isManager && !isLeave && dinnerVal > 0
                            ? 'tap-active text-DynamicMain hover:bg-slate-700'
                            : 'opacity-30 cursor-not-allowed text-DynamicMuted'
                        }`}
                        title={isLeave ? 'Disabled (On Break)' : 'Subtract 0.5'}
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <span className="font-extrabold text-xs text-DynamicMain min-w-[20px] text-center">
                        {formatMealValue(dinnerVal)}
                      </span>

                      <button
                        type="button"
                        disabled={!isManager || isLeave}
                        onClick={() => handleStepMeal(member.id, 'dinner', 0.5)}
                        className={`w-6 h-6 sharp-xs font-extrabold text-xs flex items-center justify-center transition ${
                          isManager && !isLeave
                            ? 'tap-active theme-btn-primary hover:brightness-110 shadow-xs'
                            : 'opacity-30 cursor-not-allowed surface-card border border-slate-700 text-DynamicMuted'
                        }`}
                        title={isLeave ? 'Disabled (On Break)' : 'Add 0.5'}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Confirmation Modal to Resume Meals (Confirm on LEFT, Cancel on RIGHT) */}
      <ConfirmModal
        isOpen={Boolean(resumingMember)}
        onClose={() => setResumingMember(null)}
        onConfirm={handleConfirmResumeMeals}
        title="Resume Daily Meals"
        message={`Resume meals for ${
          resumingMember?.user?.name || 'this member'
        } on ${selectedDate}? This will remove the break restriction for this date so meals can be recorded again.`}
        confirmText="Yes, Resume Meals"
        cancelText="Cancel"
        isDestructive={false}
        isLoading={isResuming}
      />
    </div>
  );
}
