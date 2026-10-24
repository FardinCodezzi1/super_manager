import { useState } from 'react';
import { LogOut, Copy, Check, BookOpen, AlertTriangle, Download } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useMess } from '../../context/MessContext';
import { messService } from '../../services/messService';
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
  const { activeMess, isManager, currentMonthKey } = useMess();
  const { themeConfig, setPreset, palettes } = useTheme();

  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  // Export Data State
  const initialYear = currentMonthKey ? currentMonthKey.split('-')[0] : String(new Date().getFullYear());
  const initialMonth = currentMonthKey ? currentMonthKey.split('-')[1] : String(new Date().getMonth() + 1).padStart(2, '0');
  const [exportYear, setExportYear] = useState(initialYear);
  const [exportMonth, setExportMonth] = useState(initialMonth);
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
      const data = await messService.exportData(monthKey);
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const cleanMessName = activeMess?.name ? activeMess.name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') : 'mess';
      link.download = `mess-export-${cleanMessName}-${monthKey}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`Exported mess data for ${monthKey} successfully!`, 'success');
    } catch (err) {
      showToast(err.message || `No export data found for ${monthKey}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const currentYr = new Date().getFullYear();
  const availableYears = [currentYr - 2, currentYr - 1, currentYr, currentYr + 1, currentYr + 2];

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
                    {MONTH_NAMES.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
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
                disabled={isExporting}
                className="tap-active w-full py-1.5 theme-btn-primary sharp-xs text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting ? 'Exporting...' : `Export Data (${exportYear}-${exportMonth})`}</span>
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
                    className={`tap-active p-1.5 sharp-xs flex items-center gap-1.5 text-[10px] font-bold border transition ${
                      isSelected
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
