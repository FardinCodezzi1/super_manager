import { useState, useMemo, useEffect } from 'react';
import { LogOut, Copy, Check, BookOpen, AlertTriangle, Download } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useMess } from '../../context/MessContext';
import { messService } from '../../services/messService';
import { summaryService } from '../../services/summaryService';
import { showToast } from '../common/Toast';
import { copyText } from '../../utils/clipboard';
import { ConfirmModal } from '../common/ConfirmModal';

const MONTH_NAMES = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export function SettingsModal({ isOpen, onClose, onOpenCreator, onOpenManual }) {
  const { currentUser, logout, refreshMe } = useAuth();
  const { activeMess, isManager, currentMonthKey, months } = useMess();
  const { themeConfig, setPreset, palettes } = useTheme();

  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  // Compute strictly recorded months in this mess's database records
  const recordedMonthKeys = useMemo(() => {
    const set = new Set();
    (months || []).forEach((m) => {
      if (m.monthKey) set.add(m.monthKey);
    });
    if (currentMonthKey) set.add(currentMonthKey);
    return Array.from(set).sort().reverse();
  }, [months, currentMonthKey]);

  // Available Years: ONLY years the mess has records on
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(recordedMonthKeys.map((k) => k.split('-')[0]))).sort().reverse();
    return years.length > 0 ? years : [String(new Date().getFullYear())];
  }, [recordedMonthKeys]);

  const initialYear = availableYears[0] || String(new Date().getFullYear());
  const [exportYear, setExportYear] = useState(initialYear);

  // Available Months for selected year: ONLY months the mess has records on
  const availableMonthsForYear = useMemo(() => {
    const monthNumbers = recordedMonthKeys
      .filter((k) => k.startsWith(exportYear + '-'))
      .map((k) => k.split('-')[1]);

    const filtered = MONTH_NAMES.filter((m) => monthNumbers.includes(m.value));
    return filtered;
  }, [recordedMonthKeys, exportYear]);

  const [exportMonth, setExportMonth] = useState(() => {
    return availableMonthsForYear[0]?.value || '01';
  });

  // Re-sync exportMonth if current selection isn't in availableMonthsForYear
  useEffect(() => {
    if (availableMonthsForYear.length > 0 && !availableMonthsForYear.some((m) => m.value === exportMonth)) {
      setExportMonth(availableMonthsForYear[0].value);
    }
  }, [availableMonthsForYear, exportMonth]);

  const [isExporting, setIsExporting] = useState(false);

  // Disband Mess Modal State
  const [isDisbandModalOpen, setIsDisbandModalOpen] = useState(false);
  const [disbandPassword, setDisbandPassword] = useState('');
  const [disbanding, setDisbanding] = useState(false);

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  };

  const handleCopyCode = async () => {
    if (!activeMess) return;
    const success = await copyText(activeMess.inviteCode);
    if (success) {
      setCopied(true);
      showToast('Invite code copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } else {
      showToast(activeMess.inviteCode, 'info');
    }
  };

  const handleConfirmLeaveMess = async () => {
    setLeaving(true);
    try {
      await messService.leaveMess();
      showToast('You have left the mess successfully.', 'success');
      setIsLeaveModalOpen(false);
      onClose();
      await refreshMe();
    } catch (err) {
      showToast(err.message || 'Failed to leave mess', 'error');
    } finally {
      setLeaving(false);
    }
  };

  const handleConfirmCloseMess = async (e) => {
    e.preventDefault();
    if (!disbandPassword) {
      showToast('Please enter your manager password', 'error');
      return;
    }

    setDisbanding(true);
    try {
      await messService.deleteMess({ password: disbandPassword, force: true });
      showToast('Mess closed and disbanded successfully.', 'success');
      setIsDisbandModalOpen(false);
      setDisbandPassword('');
      onClose();
      await refreshMe();
    } catch (err) {
      showToast(err.message || 'Failed to close mess', 'error');
    } finally {
      setDisbanding(false);
    }
  };

  const handleExportData = async () => {
    const monthKey = `${exportYear}-${exportMonth}`;
    setIsExporting(true);
    try {
      const [exportRes, summaryRes] = await Promise.all([
        messService.exportData(monthKey),
        summaryService.getSummary(monthKey).catch(() => null),
      ]);

      const messName = activeMess?.name || 'Mess';
      const cleanMessName = messName.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');

      // Generate structured, clean human-readable text report
      const line = '============================================================';
      const subline = '------------------------------------------------------------';

      let txt = `${line}\n`;
      txt += `           MESS FINANCIAL & MEAL REPORT\n`;
      txt += `${line}\n`;
      txt += `Mess Name:      ${messName}\n`;
      txt += `Report Month:   ${monthKey}\n`;
      txt += `Generated On:   ${new Date().toLocaleString()}\n`;
      txt += `Export Version: ${exportRes.exportVersion || '1.0'}\n`;
      txt += `${line}\n\n`;

      // 1. FINANCIAL KPI SUMMARY
      const mealRate = Number(summaryRes?.mealRate ?? summaryRes?.financials?.mealRate ?? 0);
      const totalMeals = Number(summaryRes?.totalMeals ?? summaryRes?.financials?.totalMeals ?? 0);
      const totalApprovedBazar = Number(summaryRes?.totalApprovedBazar ?? summaryRes?.financials?.totalApprovedBazar ?? 0);
      const totalDeposits = Number(summaryRes?.totalDeposits ?? summaryRes?.financials?.totalDeposits ?? 0);
      const netSurplus = totalDeposits - totalApprovedBazar;

      txt += `1. MONTH FINANCIAL OVERVIEW\n`;
      txt += `${subline}\n`;
      txt += `• Calculated Meal Rate:    ৳${mealRate.toFixed(2)} / meal\n`;
      txt += `• Total Meals Consumed:    ${totalMeals.toFixed(1)} meals\n`;
      txt += `• Total Approved Bazar:    ৳${totalApprovedBazar.toFixed(2)}\n`;
      txt += `• Total Deposits Received: ৳${totalDeposits.toFixed(2)}\n`;
      txt += `• Net Fund Treasury Cash:  ৳${netSurplus.toFixed(2)} (${netSurplus >= 0 ? 'Surplus' : 'Deficit'})\n\n`;

      // 2. MEMBER BALANCES & SETTLEMENT
      const memberSummaries = summaryRes?.memberSummaries || summaryRes?.membersSummary || [];
      txt += `2. MEMBER ACCOUNTS & SETTLEMENT\n`;
      txt += `${subline}\n`;
      txt += `Name`.padEnd(20) + `Meals`.padEnd(10) + `Deposit`.padEnd(14) + `Meal Cost`.padEnd(14) + `Balance / Status\n`;
      txt += `${subline}\n`;

      memberSummaries.forEach((m) => {
        const name = (m.name || 'Member').padEnd(20).substring(0, 20);
        const meals = `${Number(m.totalMeals || 0).toFixed(1)}`.padEnd(10);
        const dep = `৳${Number(m.totalDeposit || 0).toFixed(2)}`.padEnd(14);
        const cost = `৳${Number(m.mealCost || 0).toFixed(2)}`.padEnd(14);
        const bal = Number(m.balance || 0);
        const status = bal >= 0 ? `+৳${bal.toFixed(2)} (Refund)` : `-৳${Math.abs(bal).toFixed(2)} (Due)`;
        txt += `${name}${meals}${dep}${cost}${status}\n`;
      });
      if (memberSummaries.length === 0) {
        txt += `No member summary calculations available.\n`;
      }
      txt += `\n`;

      // 3. BAZAR ENTRIES
      const bazarEntries = exportRes.bazarEntries || [];
      txt += `3. BAZAR EXPENSES LOG (${bazarEntries.length} entries)\n`;
      txt += `${subline}\n`;
      txt += `Date`.padEnd(12) + `Category`.padEnd(16) + `Amount`.padEnd(12) + `Buyer`.padEnd(18) + `Status\n`;
      txt += `${subline}\n`;
      bazarEntries.forEach((b) => {
        const d = (b.date ? b.date.split('T')[0] : '').padEnd(12);
        const cat = (b.category || 'Bazar').padEnd(16).substring(0, 16);
        const amt = `৳${Number(b.amount || 0).toFixed(2)}`.padEnd(12);
        const buyer = (b.member?.user?.name || b.memberName || 'Member').padEnd(18).substring(0, 18);
        const status = b.status || 'APPROVED';
        txt += `${d}${cat}${amt}${buyer}${status}\n`;
        if (b.notes) {
          txt += `   └ Notes: ${b.notes}\n`;
        }
      });
      if (bazarEntries.length === 0) {
        txt += `No bazar entries recorded for this month.\n`;
      }
      txt += `\n`;

      // 4. DEPOSIT RECORDS
      const deposits = exportRes.deposits || [];
      txt += `4. DEPOSIT RECORDS LOG (${deposits.length} entries)\n`;
      txt += `${subline}\n`;
      txt += `Date`.padEnd(12) + `Member Name`.padEnd(24) + `Amount`.padEnd(14) + `Notes\n`;
      txt += `${subline}\n`;
      deposits.forEach((dep) => {
        const d = (dep.date ? dep.date.split('T')[0] : '').padEnd(12);
        const mem = (dep.member?.user?.name || dep.memberName || 'Member').padEnd(24).substring(0, 24);
        const amt = `৳${Number(dep.amount || 0).toFixed(2)}`.padEnd(14);
        const notes = dep.notes || '-';
        txt += `${d}${mem}${amt}${notes}\n`;
      });
      if (deposits.length === 0) {
        txt += `No deposits recorded for this month.\n`;
      }
      txt += `\n`;

      // 5. DAILY MEALS LOG
      const dailyMeals = exportRes.dailyMeals || [];
      txt += `5. DAILY MEALS BREAKDOWN (${dailyMeals.length} records)\n`;
      txt += `${subline}\n`;
      txt += `Date`.padEnd(12) + `Member Name`.padEnd(22) + `Lunch`.padEnd(8) + `Dinner`.padEnd(8) + `Total`.padEnd(8) + `Break\n`;
      txt += `${subline}\n`;
      dailyMeals.forEach((dm) => {
        const d = (dm.date ? dm.date.split('T')[0] : '').padEnd(12);
        const mem = (dm.member?.user?.name || dm.memberName || 'Member').padEnd(22).substring(0, 22);
        const lunch = `${Number(dm.lunch || 0).toFixed(1)}`.padEnd(8);
        const dinner = `${Number(dm.dinner || 0).toFixed(1)}`.padEnd(8);
        const total = `${(Number(dm.lunch || 0) + Number(dm.dinner || 0)).toFixed(1)}`.padEnd(8);
        const leave = dm.isLeave ? 'ON BREAK' : 'No';
        txt += `${d}${mem}${lunch}${dinner}${total}${leave}\n`;
      });
      if (dailyMeals.length === 0) {
        txt += `No daily meals recorded for this month.\n`;
      }
      txt += `\n`;

      txt += `${line}\n`;
      txt += `          Report generated by Super Manager App\n`;
      txt += `              Creator: FARDIN ABU UBAID\n`;
      txt += `${line}\n`;

      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mess-report-${cleanMessName}-${monthKey}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`Exported report for ${monthKey} as TXT!`, 'success');
    } catch (err) {
      showToast(err.message || `No export data found for ${monthKey}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Settings &amp; Account"
        subtitle="Manage theme, preferences and active mess"
        maxWidth="max-w-sm"
      >
        <div className="space-y-3.5">
          {/* User Account Info */}
          <div className="surface-subtle p-3 sharp-xs flex items-center justify-between border border-slate-700/40">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 sharp-xs theme-btn-primary flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs">
                {getInitials(currentUser?.name)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-DynamicMain truncate">{currentUser?.name}</p>
                <p className="text-[10px] text-DynamicMuted truncate">{currentUser?.email}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenCreator}
              className="tap-active px-2 py-1 theme-bg-soft border sharp-xs text-[10px] font-bold text-DynamicMain whitespace-nowrap"
            >
              Creator
            </button>
          </div>

          {/* Active Mess Info & Actions */}
          {activeMess && (
            <div className="surface-subtle p-3 sharp-xs space-y-2 border border-slate-700/40">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase font-bold text-DynamicMuted">
                    Active Mess
                  </span>
                  <p className="text-xs font-bold text-DynamicMain truncate">{activeMess.name}</p>
                </div>
                <span className="px-1.5 py-0.5 text-[9px] font-bold surface-card border text-DynamicSec sharp-xs">
                  {isManager ? 'MANAGER' : 'MEMBER'}
                </span>
              </div>

              {/* Copy Invite Code */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-700/30">
                <span className="text-DynamicMuted text-[11px]">Invite Code:</span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="tap-active font-mono font-bold text-indigo-400 flex items-center gap-1 hover:underline"
                >
                  <span>{activeMess.inviteCode}</span>
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>

              {/* Leave or Disband Mess */}
              <div className="pt-1.5 border-t border-slate-700/30 space-y-1.5">
                {!isManager && (
                  <button
                    type="button"
                    onClick={() => setIsLeaveModalOpen(true)}
                    className="tap-active w-full py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 sharp-xs text-xs font-bold"
                  >
                    Leave Mess
                  </button>
                )}

                {isManager && (
                  <button
                    type="button"
                    onClick={() => setIsDisbandModalOpen(true)}
                    className="tap-active w-full py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 sharp-xs text-xs font-bold"
                  >
                    Disband Mess (Manager)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Export Mess Data by Month & Year */}
          {activeMess && (
            <div className="surface-subtle p-3 sharp-xs space-y-2 border border-slate-700/40">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase font-bold text-DynamicMuted">
                    Export Mess Records
                  </span>
                  <p className="text-xs font-bold text-DynamicMain">Download Monthly Backup</p>
                </div>
                <Download className="w-4 h-4 text-emerald-400" />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-700/30">
                <div>
                  <label className="block text-[10px] font-semibold text-DynamicMuted mb-0.5">
                    Month
                  </label>
                  <select
                    value={exportMonth}
                    onChange={(e) => setExportMonth(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs surface-input sharp-xs font-semibold"
                  >
                    {availableMonthsForYear.length > 0 ? (
                      availableMonthsForYear.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))
                    ) : (
                      <option value="">No records</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-DynamicMuted mb-0.5">
                    Year
                  </label>
                  <select
                    value={exportYear}
                    onChange={(e) => setExportYear(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs surface-input sharp-xs font-semibold"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={String(y)}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExportData}
                disabled={isExporting || !exportMonth}
                className="tap-active w-full py-1.5 theme-btn-primary sharp-xs text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting ? 'Exporting...' : `Export TXT Report (${exportYear}-${exportMonth})`}</span>
              </button>
            </div>
          )}

          {/* User Manual Trigger */}
          <button
            type="button"
            onClick={onOpenManual}
            className="tap-active w-full p-2.5 surface-subtle sharp-xs flex items-center justify-between border border-slate-700/40 hover:border-slate-500 text-left transition"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-DynamicMain">User Manual &amp; App Guide</p>
                <p className="text-[10px] text-DynamicMuted truncate">
                  Rules, leave requests &amp; anti-cheat duty logs
                </p>
              </div>
            </div>
            <span className="text-DynamicMuted">&rarr;</span>
          </button>

          {/* 17 Accent Colors Picker */}
          <div className="space-y-1.5 border-t pt-2.5" style={{ borderColor: 'var(--border-col)' }}>
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold text-DynamicSec uppercase tracking-wider">
                Accent Color (17 Shades)
              </label>
              <span className="text-[10px] font-bold theme-text-primary uppercase">
                {palettes[themeConfig.preset]?.label || 'Indigo'}
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 max-h-28 overflow-y-auto pr-0.5">
              {Object.entries(palettes).map(([key, p]) => {
                const isSelected = themeConfig.preset === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPreset(key)}
                    className={`tap-active p-1.5 sharp-xs flex items-center gap-1.5 text-[10px] font-bold border transition ${isSelected
                        ? 'border-white bg-white/10 text-DynamicMain'
                        : 'surface-subtle border-slate-700/50 text-DynamicMuted hover:border-slate-500'
                      }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: p.primary }}
                    ></span>
                    <span className="truncate">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sign Out Action */}
          <div className="border-t pt-2.5" style={{ borderColor: 'var(--border-col)' }}>
            <button
              type="button"
              onClick={() => {
                onClose();
                logout();
                showToast('Signed out', 'info');
              }}
              className="tap-active w-full py-2 surface-subtle border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 sharp-xs text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal to Leave Mess (Confirm on LEFT, Cancel on RIGHT) */}
      <ConfirmModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        onConfirm={handleConfirmLeaveMess}
        title="Leave Active Mess"
        message="Are you sure you want to leave this mess? You will be free to join or create another mess anytime."
        confirmText="Yes, Leave Mess"
        cancelText="Cancel"
        isLoading={leaving}
      />

      {/* Disband Mess Modal (Password Protected, Confirm on LEFT, Cancel on RIGHT) */}
      <Modal
        isOpen={isDisbandModalOpen}
        onClose={() => setIsDisbandModalOpen(false)}
        title="Disband Active Mess"
        subtitle="Permanent Manager Action"
        maxWidth="max-w-xs"
      >
        <form onSubmit={handleConfirmCloseMess} className="space-y-3">
          <div className="flex items-start gap-2 surface-subtle p-2.5 sharp-xs border border-rose-500/40 text-rose-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <p>
              This will permanently close this mess and remove all roommate memberships. Enter your password to confirm.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
              Your Account Password
            </label>
            <input
              type="password"
              required
              value={disbandPassword}
              onChange={(e) => setDisbandPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-2 py-1.5 text-xs surface-input sharp-xs font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="submit"
              disabled={disbanding}
              className="tap-active w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sharp-xs disabled:opacity-50"
            >
              {disbanding ? 'Disbanding...' : 'Disband Mess'}
            </button>
            <button
              type="button"
              disabled={disbanding}
              onClick={() => setIsDisbandModalOpen(false)}
              className="tap-active w-full py-2 surface-subtle border border-slate-700 text-DynamicSec font-bold text-xs sharp-xs"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
