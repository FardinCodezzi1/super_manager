import { useState } from 'react';
import { Copy, Check, Plus } from 'lucide-react';
import { useMess } from '../../context/MessContext';
import { showToast } from '../common/Toast';
import { copyText } from '../../utils/clipboard';

export function OverviewView({ onOpenDepositForMember }) {
  const { summary, activeMess, currentMonthKey, isManager, isPastMonth } = useMess();
  const [copied, setCopied] = useState(false);

  // Robustly extract metrics regardless of whether returned at root or under .financials
  const mealRate = Number(summary?.mealRate ?? summary?.financials?.mealRate ?? 0);
  const totalMeals = Number(summary?.totalMeals ?? summary?.financials?.totalMeals ?? 0);
  const totalApprovedBazar = Number(summary?.totalApprovedBazar ?? summary?.financials?.totalApprovedBazar ?? 0);
  const totalDeposits = Number(summary?.totalDeposits ?? summary?.financials?.totalDeposits ?? 0);

  // Normalized list of member summaries
  const memberSummaries = summary?.memberSummaries || summary?.membersSummary || [];

  const handleCopySummary = async () => {
    if (!activeMess) return;

    let text = `📊 *${activeMess.name} - Meal Summary*\n`;
    text += `📅 Month: ${currentMonthKey}\n`;
    text += `--------------------------------\n`;
    text += `🍲 Meal Rate: ৳${mealRate.toFixed(2)}\n`;
    text += `🍽️ Total Meals: ${totalMeals.toFixed(1)}\n`;
    text += `🛒 Approved Bazar: ৳${totalApprovedBazar.toFixed(2)}\n`;
    text += `💰 Total Deposits: ৳${totalDeposits.toFixed(2)}\n`;
    text += `--------------------------------\n`;
    text += `*Roommate Balances:*\n`;

    memberSummaries.forEach((m) => {
      const bal = Number(m.balance) || 0;
      const status = bal >= 0 ? `+৳${bal.toFixed(2)} (Refund)` : `-৳${Math.abs(bal).toFixed(2)} (Due)`;
      text += `• ${m.name}: Meals: ${m.totalMeals} | Deposit: ৳${Number(m.totalDeposit || 0).toFixed(2)} | Cost: ৳${Number(m.mealCost || 0).toFixed(2)} | Balance: ${status}\n`;
    });

    const success = await copyText(text);
    if (success) {
      setCopied(true);
      showToast('Meal summary copied to clipboard for WhatsApp / SMS!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } else {
      showToast('Failed to copy summary to clipboard', 'error');
    }
  };

  return (
    <div className="space-y-2.5">
      {/* 4 Metric KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        <div className="surface-card p-2.5 space-y-0.5">
          <span className="text-[10px] font-bold text-DynamicMuted uppercase">Meal Rate</span>
          <p className="text-sm font-extrabold text-DynamicMain">
            ৳{mealRate.toFixed(2)}
          </p>
        </div>

        <div className="surface-card p-2.5 space-y-0.5">
          <span className="text-[10px] font-bold text-DynamicMuted uppercase">Total Meals</span>
          <p className="text-sm font-extrabold text-DynamicMain">
            {totalMeals.toFixed(1)}
          </p>
        </div>

        <div className="surface-card p-2.5 space-y-0.5">
          <span className="text-[10px] font-bold text-DynamicMuted uppercase">Approved Bazar</span>
          <p className="text-sm font-extrabold text-DynamicMain">
            ৳{totalApprovedBazar.toFixed(2)}
          </p>
        </div>

        <div className="surface-card p-2.5 space-y-0.5">
          <span className="text-[10px] font-bold text-DynamicMuted uppercase">Total Deposits</span>
          <p className="text-sm font-extrabold text-DynamicMain">
            ৳{totalDeposits.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Member Financial Balances Header */}
      <div className="surface-card flex items-center justify-between py-2 px-3">
        <div>
          <h3 className="text-xs font-bold text-DynamicMain uppercase tracking-wider">
            Member Accounts
          </h3>
          <p className="text-[10px] text-DynamicMuted">Deposit - (Meals × Rate) = Balance</p>
        </div>
        <div className="flex items-center gap-1.5">
          {/* {isManager && (
            <button
              type="button"
              disabled={isPastMonth}
              onClick={isPastMonth ? undefined : () => onOpenDepositForMember?.(null)}
              className={`px-2.5 py-1 sharp-xs text-xs font-semibold flex items-center gap-1 shadow-xs whitespace-nowrap ${
                isPastMonth
                  ? 'opacity-40 cursor-not-allowed surface-subtle text-DynamicMuted border border-slate-700/30'
                  : 'tap-active theme-btn-primary'
              }`}
              title={isPastMonth ? 'Disabled: cannot modify past month deposit balance' : "Add or update a member's deposit balance"}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Deposit</span>
            </button>
          )} */}
          <button
            type="button"
            onClick={handleCopySummary}
            className="tap-active px-2.5 py-1 surface-subtle sharp-xs text-xs font-semibold text-DynamicMain flex items-center gap-1.5 whitespace-nowrap border border-slate-700/40"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy Text</span>
          </button>
        </div>
      </div>

      {/* Member Cards Layout matching Screenshot 1 */}
      <div className="space-y-2">
        {memberSummaries.map((mem) => {
          const balance = Number(mem.balance) || 0;
          const isSurplus = balance >= 0;
          const initial = mem.name ? mem.name.trim()[0].toUpperCase() : 'M';
          const mealsCount = Number(mem.totalMeals) || 0;

          return (
            <div
              key={mem.memberId}
              className="surface-card p-3 sharp-xs space-y-2.5 border border-slate-800"
            >
              {/* Top Row: Initial Avatar, Name, Meals Subtitle & Balance Badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 sharp-xs theme-btn-primary flex items-center justify-center font-extrabold text-sm shrink-0 shadow-xs">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs sm:text-sm font-bold text-DynamicMain truncate">
                        {mem.name}
                      </h4>
                      {mem.role === 'MANAGER' && (
                        <span className="px-1 py-0.2 sharp-xs text-[8px] font-bold theme-bg-soft border shrink-0">
                          MANAGER
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-DynamicMuted mt-0.5">
                      {mealsCount.toFixed(1)} meals
                    </p>
                  </div>
                </div>

                {/* Right: Badge & Large Balance Number */}
                <div className="text-right shrink-0">
                  <span
                    className={`inline-block px-1.5 py-0.5 text-[9px] font-extrabold sharp-xs tracking-wider uppercase border ${isSurplus
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                      : 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                      }`}
                  >
                    {isSurplus ? 'REFUND / CREDIT' : 'DUE / OWED'}
                  </span>
                  <div
                    className={`text-sm sm:text-base font-extrabold mt-0.5 ${isSurplus ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                  >
                    {isSurplus ? `+৳${balance.toFixed(2)}` : `-৳${Math.abs(balance).toFixed(2)}`}
                  </div>
                </div>
              </div>

              {/* Horizontal Divider */}
              <div className="border-t border-slate-700/40"></div>

              {/* 3-Column Stats Sub-Bar: DEPOSIT | COST | MEALS */}
              <div className="surface-subtle p-2 sharp-xs grid grid-cols-3 gap-1 text-center border border-slate-800/80">
                <div>
                  <span className="block text-[9px] font-extrabold text-DynamicMuted uppercase tracking-wider">
                    DEPOSIT
                  </span>
                  <span className="text-xs font-bold text-DynamicMain">
                    ৳{Number(mem.totalDeposit || 0).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] font-extrabold text-DynamicMuted uppercase tracking-wider">
                    COST
                  </span>
                  <span className="text-xs font-bold text-DynamicMain">
                    ৳{Number(mem.mealCost || 0).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] font-extrabold text-DynamicMuted uppercase tracking-wider">
                    MEALS
                  </span>
                  <span className="text-xs font-bold text-DynamicMain">
                    {mealsCount.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Manager Quick Action: Update Deposit Balance */}
              {/* {isManager && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-700/40">
                  <span className="text-[10px] text-DynamicMuted">Update member deposit:</span>
                  <button
                    type="button"
                    disabled={isPastMonth}
                    onClick={isPastMonth ? undefined : () => onOpenDepositForMember?.(mem.memberId)}
                    className={`px-2 py-1 text-xs font-semibold sharp-xs flex items-center gap-1 shadow-xs ${isPastMonth
                        ? 'opacity-40 cursor-not-allowed surface-subtle text-DynamicMuted border border-slate-700/30'
                        : 'tap-active theme-btn-primary'
                      }`}
                    title={isPastMonth ? 'Disabled: cannot modify past month deposit balance' : 'Update or add deposit balance for this member'}
                  >
                    <Plus className="w-3 h-3" />
                    <span>Update Deposit</span>
                  </button>
                </div>
              )} */}
            </div>
          );
        })}

        {memberSummaries.length === 0 && (
          <p className="text-xs text-center text-DynamicMuted py-4">
            No member accounts or calculations recorded for this month yet.
          </p>
        )}
      </div>
    </div>
  );
}
