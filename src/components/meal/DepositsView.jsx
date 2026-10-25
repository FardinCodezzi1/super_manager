import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2, Edit3 } from 'lucide-react';
import { useMess } from '../../context/MessContext';
import { depositService } from '../../services/depositService';
import { showToast } from '../common/Toast';
import { ConfirmModal } from '../common/ConfirmModal';
import { EditDepositModal } from './EditDepositModal';

export function DepositsView({ onOpenAddDeposit }) {
  const { currentMonthKey, members, isManager, refreshAllMessData, dataVersion, isPastMonth } = useMess();

  const [depositsList, setDepositsList] = useState([]);
  const [filterMember, setFilterMember] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');

  // Edit Modal State
  const [editingDeposit, setEditingDeposit] = useState(null);

  // Delete Modal State
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDeposits = useCallback(async () => {
    try {
      const res = await depositService.getDeposits({ monthKey: currentMonthKey });
      setDepositsList(res.deposits || []);
    } catch (err) {
      showToast(err.message || 'Failed to load deposits', 'error');
    }
  }, [currentMonthKey]);

  useEffect(() => {
    fetchDeposits();
  }, [fetchDeposits, dataVersion]);

  const totalCollected = useMemo(() => {
    return depositsList.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  }, [depositsList]);

  // Filter & Sort
  const filteredDeposits = useMemo(() => {
    let list = [...depositsList];

    if (filterMember !== 'all') {
      list = list.filter((d) => d.memberId === filterMember);
    }

    list.sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.date) - new Date(a.date);
      if (sortBy === 'date-asc') return new Date(a.date) - new Date(b.date);
      if (sortBy === 'amount-desc') return Number(b.amount) - Number(a.amount);
      if (sortBy === 'amount-asc') return Number(a.amount) - Number(b.amount);
      return 0;
    });

    return list;
  }, [depositsList, filterMember, sortBy]);

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await depositService.deleteDeposit(deletingId);
      showToast('Deposit record deleted', 'info');
      setDeletingId(null);
      await Promise.all([fetchDeposits(), refreshAllMessData()]);
    } catch (err) {
      showToast(err.message || 'Failed to delete deposit', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Header & Controls */}
      <div className="surface-card space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-bold text-DynamicSec uppercase tracking-wider">
              Member Deposits
            </h2>
            <p className="text-xs text-DynamicMuted mt-0.5">
              Total Collected: <strong className="text-DynamicMain">৳{totalCollected.toFixed(2)}</strong>
            </p>
          </div>
          {isManager && (
            <button
              type="button"
              disabled={isPastMonth}
              onClick={isPastMonth ? undefined : onOpenAddDeposit}
              className={`px-2.5 py-1.5 sharp-xs text-xs font-semibold flex items-center gap-1 shadow-xs transition whitespace-nowrap ${
                isPastMonth
                  ? 'opacity-40 cursor-not-allowed surface-subtle text-DynamicMuted border border-slate-700/30'
                  : 'tap-active theme-btn-primary'
              }`}
              title={isPastMonth ? 'Disabled: cannot add deposits for a past archived month' : 'Add Deposit'}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Deposit</span>
            </button>
          )}
        </div>

        {/* Filter & Sort Controls */}
        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-700/30">
          <div>
            <label className="block text-[10px] font-semibold text-DynamicMuted mb-0.5">
              Filter Member
            </label>
            <select
              value={filterMember}
              onChange={(e) => setFilterMember(e.target.value)}
              className="w-full px-2 py-1 text-xs surface-input sharp-xs"
            >
              <option value="all">All Members</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.user?.name || 'Member'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-DynamicMuted mb-0.5">
              Sort
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-2 py-1 text-xs surface-input sharp-xs"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Amount: High to Low</option>
              <option value="amount-asc">Amount: Low to High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Deposits List */}
      <div className="space-y-1.5">
        {filteredDeposits.map((item) => (
          <div
            key={item.id}
            className="p-2.5 surface-card border border-slate-800 flex items-center justify-between gap-2"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 font-bold text-xs text-DynamicMain">
                <span className="truncate">{item.member?.user?.name || 'Member'}</span>
                <span className="text-emerald-400 font-extrabold shrink-0">
                  ৳{Number(item.amount).toFixed(2)}
                </span>
              </div>
              <p className="text-[10px] text-DynamicMuted truncate mt-0.5">
                Deposit • {new Date(item.date).toLocaleDateString()}
                {item.notes ? ` • ${item.notes}` : ''}
              </p>
            </div>

            {isManager && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingDeposit(item)}
                  className="tap-active px-1.5 py-0.5 surface-input sharp-xs text-[10px] font-bold text-DynamicSec hover:text-DynamicMain border flex items-center gap-1"
                  title="Edit Deposit Record"
                >
                  <Edit3 className="w-3 h-3 text-indigo-400" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingId(item.id)}
                  className="tap-active p-1 text-DynamicMuted hover:text-rose-400 sharp-xs"
                  title="Delete Deposit"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}

        {filteredDeposits.length === 0 && (
          <p className="text-xs text-center text-DynamicMuted py-4">
            No deposits recorded for this month yet.
          </p>
        )}
      </div>

      {/* Edit Deposit Modal */}
      <EditDepositModal
        isOpen={Boolean(editingDeposit)}
        onClose={() => setEditingDeposit(null)}
        deposit={editingDeposit}
        onSuccess={fetchDeposits}
      />

      {/* Custom Confirm Delete Modal (Confirm on LEFT, Cancel on RIGHT) */}
      <ConfirmModal
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Deposit Record"
        message="Are you sure you want to delete this deposit record? This will immediately update member balances."
        confirmText="Yes, Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
      />
    </div>
  );
}
