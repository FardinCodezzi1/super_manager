import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useMess } from '../../context/MessContext';
import { bazarService } from '../../services/bazarService';
import { mealService } from '../../services/mealService';
import { showToast } from '../common/Toast';

export function PendingApprovalsBanner() {
  const {
    isManager,
    pendingBazar,
    pendingLeaves,
    setPendingBazar,
    setPendingLeaves,
    refreshAllMessData,
  } = useMess();
  const [processingId, setProcessingId] = useState(null);

  if (!isManager || (pendingBazar.length === 0 && pendingLeaves.length === 0)) {
    return null;
  }

  const totalPending = pendingBazar.length + pendingLeaves.length;

  const handleApproveBazar = async (id) => {
    setProcessingId(id);
    // Optimistic removal
    setPendingBazar((prev) => prev.filter((b) => b.id !== id));
    try {
      await bazarService.approveBazar(id, { status: 'APPROVED' });
      showToast('Bazar entry approved!', 'success');
      await refreshAllMessData();
    } catch (err) {
      showToast(err.message || 'Approval failed', 'error');
      await refreshAllMessData();
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectBazar = async (id) => {
    setProcessingId(id);
    // Optimistic removal
    setPendingBazar((prev) => prev.filter((b) => b.id !== id));
    try {
      await bazarService.approveBazar(id, { status: 'REJECTED' });
      showToast('Bazar entry rejected', 'info');
      await refreshAllMessData();
    } catch (err) {
      showToast(err.message || 'Rejection failed', 'error');
      await refreshAllMessData();
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveLeave = async (id) => {
    setProcessingId(id);
    // Optimistic removal
    setPendingLeaves((prev) => prev.filter((l) => l.id !== id));
    try {
      await mealService.approveLeaveRequest(id, { status: 'APPROVED' });
      showToast('Meal break approved! Daily meals set to 0 for the duration.', 'success');
      await refreshAllMessData();
    } catch (err) {
      showToast(err.message || 'Approval failed', 'error');
      await refreshAllMessData();
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectLeave = async (id) => {
    setProcessingId(id);
    // Optimistic removal
    setPendingLeaves((prev) => prev.filter((l) => l.id !== id));
    try {
      await mealService.approveLeaveRequest(id, { status: 'REJECTED' });
      showToast('Meal break request rejected', 'info');
      await refreshAllMessData();
    } catch (err) {
      showToast(err.message || 'Rejection failed', 'error');
      await refreshAllMessData();
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="surface-card border-amber-500/40 bg-amber-500/5 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span className="text-xs font-bold text-amber-300">Pending Approvals</span>
        </div>
        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-400/20 text-amber-300 sharp-xs">
          {totalPending} Pending
        </span>
      </div>

      <div className="space-y-1.5 text-xs">
        {/* Pending Bazar Submissions */}
        {pendingBazar.map((item) => (
          <div
            key={item.id}
            className="p-2 surface-subtle sharp-xs flex items-center justify-between gap-2"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 font-bold text-DynamicMain">
                <span>{item.member?.user?.name || 'Member'}</span>
                <span className="text-emerald-400 font-extrabold">
                  ৳{Number(item.amount).toFixed(2)}
                </span>
              </div>
              <p className="text-[10px] text-DynamicMuted truncate">
                Bazar • {item.category || 'Groceries'} • {new Date(item.date).toLocaleDateString()}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                disabled={processingId === item.id}
                onClick={() => handleApproveBazar(item.id)}
                className="tap-active px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white sharp-xs text-[10px] font-bold flex items-center gap-0.5 disabled:opacity-50"
              >
                <Check className="w-3 h-3" />
                <span>Approve</span>
              </button>
              <button
                type="button"
                disabled={processingId === item.id}
                onClick={() => handleRejectBazar(item.id)}
                className="tap-active px-2 py-1 bg-rose-600/80 hover:bg-rose-600 text-white sharp-xs text-[10px] font-bold flex items-center gap-0.5 disabled:opacity-50"
              >
                <X className="w-3 h-3" />
                <span>Reject</span>
              </button>
            </div>
          </div>
        ))}

        {/* Pending Leave Requests */}
        {pendingLeaves.map((leave) => (
          <div
            key={leave.id}
            className="p-2 surface-subtle sharp-xs flex items-center justify-between gap-2"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 font-bold text-DynamicMain">
                <span>{leave.member?.user?.name || 'Member'}</span>
                <span className="text-amber-400 font-semibold text-[11px]">Meal Break</span>
              </div>
              <p className="text-[10px] text-DynamicMuted truncate">
                {new Date(leave.startDate).toLocaleDateString()} &rarr;{' '}
                {new Date(leave.endDate).toLocaleDateString()}
                {leave.reason ? ` (${leave.reason})` : ''}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                disabled={processingId === leave.id}
                onClick={() => handleApproveLeave(leave.id)}
                className="tap-active px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white sharp-xs text-[10px] font-bold flex items-center gap-0.5 disabled:opacity-50"
              >
                <Check className="w-3 h-3" />
                <span>Approve</span>
              </button>
              <button
                type="button"
                disabled={processingId === leave.id}
                onClick={() => handleRejectLeave(leave.id)}
                className="tap-active px-2 py-1 bg-rose-600/80 hover:bg-rose-600 text-white sharp-xs text-[10px] font-bold flex items-center gap-0.5 disabled:opacity-50"
              >
                <X className="w-3 h-3" />
                <span>Reject</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
