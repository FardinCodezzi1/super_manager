import { useState, useEffect, useCallback } from 'react';
import { UserCheck, History, ArrowUp, ArrowDown } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useMess } from '../../context/MessContext';
import { useAuth } from '../../context/AuthContext';
import { messService } from '../../services/messService';
import { showToast } from '../common/Toast';

export function DutyRotationModal({ isOpen, onClose }) {
  const { members, refreshAllMessData, isManager } = useMess();
  const { refreshMe } = useAuth();

  const [sequenceData, setSequenceData] = useState(null);
  const [logsData, setLogsData] = useState([]);
  const [rotationType, setRotationType] = useState('MONTHLY');
  const [changingRotation, setChangingRotation] = useState(false);

  const [targetMemberId, setTargetMemberId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [seqRes, logRes] = await Promise.all([
        messService.getManagerSequence().catch(() => null),
        messService.getManagerLogs().catch(() => ({ logs: [] })),
      ]);
      setSequenceData(seqRes);
      setRotationType(seqRes?.rotationType || 'MONTHLY');
      setLogsData(logRes?.logs || []);

      if (members.length > 0) {
        const firstNonManager = members.find((m) => m.id !== seqRes?.currentManagerMemberId);
        if (firstNonManager) setTargetMemberId(firstNonManager.id);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load rotation data', 'error');
    }
  }, [members]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, fetchData]);

  const handleTransferRole = async (e) => {
    e.preventDefault();
    if (!targetMemberId) {
      showToast('Please select a target member to hand over duty', 'error');
      return;
    }
    if (!transferReason.trim()) {
      showToast('Please provide a reason for the duty handover (Anti-Cheat Audit)', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await messService.transferManagerRole({
        targetMemberId,
        reason: transferReason.trim(),
      });
      showToast('Manager duty transferred successfully!', 'success');
      setTransferReason('');
      await Promise.all([fetchData(), refreshAllMessData(), refreshMe()]);
    } catch (err) {
      showToast(err.message || 'Transfer failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveSequence = async (index, direction) => {
    if (!sequenceData?.sequence) return;
    const newSeq = [...sequenceData.sequence];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= newSeq.length) return;

    // Swap
    const temp = newSeq[index];
    newSeq[index] = newSeq[targetIdx];
    newSeq[targetIdx] = temp;

    const memberIds = newSeq.map((s) => s.memberId);
    try {
      await messService.updateManagerSequence({
        memberIds,
        reason: 'Manager reordered rotation sequence',
      });
      showToast('Rotation queue updated', 'info');
      await fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to update sequence', 'error');
    }
  };

  const handleUpdateRotationType = async (newType) => {
    if (!sequenceData?.sequence || sequenceData.sequence.length === 0) {
      showToast('No active members in sequence', 'error');
      return;
    }
    const memberIds = sequenceData.sequence.map((s) => s.memberId);
    setChangingRotation(true);
    try {
      await messService.updateManagerSequence({
        memberIds,
        rotationType: newType,
        reason: `Manager updated rotation schedule to ${newType}`,
      });
      setRotationType(newType);
      showToast(`Rotation cycle updated to ${newType}!`, 'success');
      await Promise.all([fetchData(), refreshAllMessData()]);
    } catch (err) {
      showToast(err.message || 'Failed to update rotation cycle', 'error');
    } finally {
      setChangingRotation(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manager Duty & Anti-Cheat Logs"
      subtitle="Scheduled rotation queue & immutable duty audit history"
      maxWidth="max-w-md"
    >
      <div className="space-y-3.5">
        {/* Current Active Manager Badge */}
        <div className="surface-subtle p-2.5 sharp-xs flex items-center justify-between border border-indigo-500/30">
          <div>
            <span className="text-[10px] text-DynamicMuted uppercase font-bold">
              Current Active Manager
            </span>
            <p className="text-xs font-extrabold text-DynamicMain">
              {sequenceData?.currentManager?.name || 'Manager'}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 text-[9px] font-bold surface-card border text-DynamicSec sharp-xs">
              {rotationType} ROTATION
            </span>
            <span className="px-2 py-0.5 theme-btn-primary sharp-xs text-[10px] font-bold">
              In Duty
            </span>
          </div>
        </div>

        {/* Rotation Cycle Schedule Setting (Weekly / Monthly) */}
        <div className="surface-subtle p-2.5 sharp-xs space-y-1.5 border border-slate-700/40">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-DynamicMuted uppercase font-bold">
                Rotation Cycle Setting
              </span>
              <p className="text-[11px] font-bold text-DynamicMain">
                {isManager ? 'Configure Manager Duty Term' : 'Active Duty Cycle'}
              </p>
            </div>
            <span className="px-2 py-0.5 surface-card border text-[10px] font-bold text-indigo-400 sharp-xs uppercase">
              {rotationType}
            </span>
          </div>

          {isManager ? (
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                type="button"
                disabled={changingRotation || rotationType === 'MONTHLY'}
                onClick={() => handleUpdateRotationType('MONTHLY')}
                className={`tap-active py-1.5 px-2 sharp-xs text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  rotationType === 'MONTHLY'
                    ? 'theme-btn-primary'
                    : 'surface-card border border-slate-700 text-DynamicSec hover:text-DynamicMain'
                }`}
              >
                <span>Monthly Cycle</span>
                {rotationType === 'MONTHLY' && <span className="text-[10px]">✓</span>}
              </button>

              <button
                type="button"
                disabled={changingRotation || rotationType === 'WEEKLY'}
                onClick={() => handleUpdateRotationType('WEEKLY')}
                className={`tap-active py-1.5 px-2 sharp-xs text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  rotationType === 'WEEKLY'
                    ? 'theme-btn-primary'
                    : 'surface-card border border-slate-700 text-DynamicSec hover:text-DynamicMain'
                }`}
              >
                <span>Weekly Cycle</span>
                {rotationType === 'WEEKLY' && <span className="text-[10px]">✓</span>}
              </button>
            </div>
          ) : (
            <p className="text-[10px] text-DynamicMuted">
              Manager duty shifts automatically on a {rotationType.toLowerCase()} basis. Only the current manager can toggle rotation between Monthly and Weekly.
            </p>
          )}
        </div>

        {/* Scheduled Rotation Sequence (Who is next in line) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-DynamicMain">
              Scheduled Rotation Order
            </span>
            <span className="text-[10px] text-DynamicMuted">
              Auto-shifts on new month cycle
            </span>
          </div>

          <div className="space-y-1 max-h-44 overflow-y-auto">
            {(sequenceData?.sequence || []).map((item, idx) => {
              const isCurrent = item.isCurrentManager;
              const isNext = !isCurrent && idx === 1;

              return (
                <div
                  key={item.memberId}
                  className={`p-2 sharp-xs flex items-center justify-between text-xs border ${
                    isCurrent
                      ? 'theme-bg-soft border-indigo-500/40'
                      : isNext
                      ? 'surface-subtle border-emerald-500/40 bg-emerald-500/5'
                      : 'surface-subtle border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[11px] font-bold text-DynamicMuted">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-DynamicMain truncate">
                      {item.name}
                    </span>
                    {isCurrent && (
                      <span className="px-1.5 py-0.2 sharp-xs text-[9px] font-bold text-indigo-400 bg-indigo-500/20">
                        ACTIVE DUTY
                      </span>
                    )}
                    {isNext && (
                      <span className="px-1.5 py-0.2 sharp-xs text-[9px] font-bold text-emerald-400 bg-emerald-500/20">
                        NEXT IN LINE
                      </span>
                    )}
                  </div>

                  {/* Manager sequence reordering buttons */}
                  {isManager && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveSequence(idx, -1)}
                        className="tap-active p-1 text-DynamicMuted hover:text-DynamicMain disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === (sequenceData?.sequence?.length || 0) - 1}
                        onClick={() => handleMoveSequence(idx, 1)}
                        className="tap-active p-1 text-DynamicMuted hover:text-DynamicMain disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {(!sequenceData?.sequence || sequenceData.sequence.length === 0) && (
              <p className="text-xs text-center text-DynamicMuted py-2">
                Loading rotation sequence...
              </p>
            )}
          </div>
        </div>

        {/* Emergency Manual Role Override / Handover */}
        <form onSubmit={handleTransferRole} className="surface-subtle p-2.5 sharp-xs space-y-2 border border-slate-700/40">
          <div>
            <div className="flex items-center gap-1 text-xs font-bold text-DynamicMain">
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Override / Handover Duty</span>
            </div>
            <p className="text-[10px] text-DynamicMuted mt-0.5">
              Any member can execute an emergency handover. The action and reason are permanently logged.
            </p>
          </div>

          <div className="space-y-1.5">
            <div>
              <label className="block text-[10px] font-semibold text-DynamicMuted mb-0.5">
                Target Roommate (New Manager)
              </label>
              <select
                required
                value={targetMemberId}
                onChange={(e) => setTargetMemberId(e.target.value)}
                className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
              >
                <option value="">Select Roommate</option>
                {members
                  .filter((m) => m.status === 'ACTIVE' && m.id !== sequenceData?.currentManagerMemberId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.user.name} ({m.user.email})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-DynamicMuted mb-0.5">
                Mandatory Reason (Audited)
              </label>
              <input
                type="text"
                required
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="e.g. Semester final exams, agreed duty switch"
                className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="tap-active w-full py-1.5 theme-btn-primary sharp-xs text-xs font-bold whitespace-nowrap disabled:opacity-50"
            >
              {submitting ? 'Executing Transfer...' : 'Execute Duty Handover & Log'}
            </button>
          </div>
        </form>

        {/* Immutable Anti-Cheat Audit History */}
        <div className="space-y-1.5 border-t pt-2" style={{ borderColor: 'var(--border-col)' }}>
          <div className="flex items-center gap-1 text-xs font-bold text-DynamicMain">
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span>Immutable Anti-Cheat Audit History</span>
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto text-[11px] pr-0.5">
            {logsData.map((log) => {
              const actionLabel = log.action.replace(/_/g, ' ');

              return (
                <div
                  key={log.id}
                  className="p-2 surface-subtle sharp-xs border-l-2 border-indigo-500 space-y-0.5"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <strong className="text-DynamicMain uppercase font-extrabold">
                      {actionLabel}
                    </strong>
                    <span className="text-DynamicMuted">
                      {new Date(log.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-[10px] text-DynamicSec font-medium">
                    {log.reason || 'Routine Manager Shift'}
                  </p>

                  <div className="text-[9px] text-DynamicMuted flex items-center gap-1 pt-0.5">
                    <span>By: <strong className="text-DynamicSec">{log.changedBy?.name || 'System'}</strong></span>
                    {log.previousManager && log.newManager && (
                      <>
                        <span>•</span>
                        <span>{log.previousManager.name} &rarr; {log.newManager.name}</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {logsData.length === 0 && (
              <p className="text-xs text-center text-DynamicMuted py-2">
                No duty transitions recorded yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
