import { useState, useEffect, useCallback } from 'react';
import { Calendar, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { mealService } from '../../services/mealService';
import { useMess } from '../../context/MessContext';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../common/Toast';
import { ConfirmModal } from '../common/ConfirmModal';

export function LeaveBreakModal({ isOpen, onClose }) {
  const { isManager, refreshAllMessData } = useMess();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'request'

  // Form State
  const todayIso = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayIso);
  const [endDate, setEndDate] = useState(todayIso);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Breaks list state
  const [breaks, setBreaks] = useState([]);
  const [loadingBreaks, setLoadingBreaks] = useState(false);

  // Cancel Break Modal State
  const [cancellingBreak, setCancellingBreak] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchBreaks = useCallback(async () => {
    setLoadingBreaks(true);
    try {
      const res = await mealService.getLeaveRequests();
      const list = res?.leaveRequests || [];
      setBreaks(list);
    } catch {
      setBreaks([]);
    } finally {
      setLoadingBreaks(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchBreaks();
    }
  }, [isOpen, fetchBreaks]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (new Date(startDate) > new Date(endDate)) {
      showToast('Start date cannot be after end date', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await mealService.createLeaveRequest({
        startDate: startDate + 'T00:00:00.000Z',
        endDate: endDate + 'T23:59:59.000Z',
        reason: reason.trim(),
      });
      showToast('Meal break request submitted!', 'success');
      setReason('');
      setActiveTab('list');
      await Promise.all([fetchBreaks(), refreshAllMessData()]);
    } catch (err) {
      showToast(err.message || 'Failed to submit request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCancelBreak = async () => {
    if (!cancellingBreak) return;
    setIsCancelling(true);
    try {
      await mealService.approveLeaveRequest(cancellingBreak.id, { status: 'REJECTED' });
      showToast('Meal break cancelled / ended', 'info');
      setCancellingBreak(null);
      await Promise.all([fetchBreaks(), refreshAllMessData()]);
    } catch (err) {
      showToast(err.message || 'Failed to cancel break', 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Meal Break Management"
      subtitle="Pause daily meals during absence or resume meals early"
      maxWidth="max-w-md"
    >
      <div className="space-y-3">
        {/* Sub-Tab Navigation */}
        <div className="grid grid-cols-2 p-1 surface-subtle sharp-xs gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`tap-active py-1 text-xs font-bold sharp-xs text-center transition ${
              activeTab === 'list'
                ? 'theme-btn-primary'
                : 'text-DynamicMuted hover:text-DynamicMain'
            }`}
          >
            Active &amp; Past Breaks ({breaks.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('request')}
            className={`tap-active py-1 text-xs font-bold sharp-xs text-center transition ${
              activeTab === 'request'
                ? 'theme-btn-primary'
                : 'text-DynamicMuted hover:text-DynamicMain'
            }`}
          >
            + Request New Break
          </button>
        </div>

        {/* TAB 1: LIST ACTIVE & RECENT BREAKS */}
        {activeTab === 'list' && (
          <div className="space-y-2">
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {breaks.map((item) => {
                const memberName = item.member?.user?.name || 'Member';
                const isOwner = item.member?.userId === currentUser?.id;
                const canCancel = isManager || isOwner;
                const isApproved = item.status === 'APPROVED';
                const isPending = item.status === 'PENDING';

                return (
                  <div
                    key={item.id}
                    className="p-2.5 surface-subtle sharp-xs border border-slate-700/40 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-DynamicMain">
                          <span className="truncate">{memberName}</span>
                          <span
                            className={`px-1.5 py-0.2 sharp-xs text-[9px] font-bold ${
                              isApproved
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : isPending
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-DynamicMuted flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-indigo-400 shrink-0" />
                          <span>
                            {new Date(item.startDate).toLocaleDateString()} &rarr;{' '}
                            {new Date(item.endDate).toLocaleDateString()}
                          </span>
                        </p>
                      </div>

                      {/* Cancel / End Break Early Button */}
                      {canCancel && (isApproved || isPending) && (
                        <button
                          type="button"
                          onClick={() => setCancellingBreak(item)}
                          className="tap-active px-2 py-1 bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-[10px] sharp-xs shrink-0 whitespace-nowrap"
                        >
                          {isApproved ? 'End Break' : 'Cancel'}
                        </button>
                      )}
                    </div>

                    {item.reason && (
                      <p className="text-[10px] text-DynamicSec bg-slate-900/40 p-1 sharp-xs border border-slate-800">
                        Reason: {item.reason}
                      </p>
                    )}
                  </div>
                );
              })}

              {breaks.length === 0 && !loadingBreaks && (
                <div className="p-4 text-center text-xs text-DynamicMuted space-y-1">
                  <AlertCircle className="w-5 h-5 mx-auto text-DynamicMuted opacity-40" />
                  <p>No active or requested meal breaks found.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: REQUEST NEW BREAK */}
        {activeTab === 'request' && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
                  Break Start Date
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
                  Break End Date
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
                Reason for Break
              </label>
              <input
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Vacation, university exams, visiting home"
                className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
              />
            </div>

            <p className="text-[10px] text-DynamicMuted leading-normal">
              When approved, your meal counts will be automatically paused for this period. You or the manager can end the break early at any time.
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="tap-active w-full py-2 theme-btn-primary sharp-xs text-xs font-bold whitespace-nowrap disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Meal Break Request'}
            </button>
          </form>
        )}
      </div>

      {/* Confirmation Modal to End/Cancel Break (Confirm on LEFT, Cancel on RIGHT) */}
      <ConfirmModal
        isOpen={Boolean(cancellingBreak)}
        onClose={() => setCancellingBreak(null)}
        onConfirm={handleConfirmCancelBreak}
        title="Cancel Meal Break"
        message={`Are you sure you want to end this break early for ${
          cancellingBreak?.member?.user?.name || 'this member'
        }? Their daily meals will be unlocked so meal counts can be recorded again.`}
        confirmText="Yes, End Break"
        cancelText="Keep Break"
        isLoading={isCancelling}
      />
    </Modal>
  );
}
