import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2, Edit3, Check, X } from 'lucide-react';
import { useMess } from '../../context/MessContext';
import { bazarService } from '../../services/bazarService';
import { showToast } from '../common/Toast';
import { ConfirmModal } from '../common/ConfirmModal';
import { EditBazarModal } from './EditBazarModal';

export function BazarView({ onOpenAddBazar }) {
  const { currentMonthKey, members, isManager, activeMemberId, refreshAllMessData } = useMess();

  const [bazarList, setBazarList] = useState([]);
  const [filterShopper, setFilterShopper] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');

  // Edit Modal State
  const [editingBazar, setEditingBazar] = useState(null);

  // Delete Modal State
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchBazar = useCallback(async () => {
    try {
      const res = await bazarService.getBazar({ monthKey: currentMonthKey });
      setBazarList(res.entries || []);
    } catch (err) {
      showToast(err.message || 'Failed to load bazar list', 'error');
    }
  }, [currentMonthKey]);

  useEffect(() => {
    fetchBazar();
  }, [fetchBazar]);

  const approvedTotal = useMemo(() => {
    return bazarList
      .filter((b) => b.status === 'APPROVED')
      .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  }, [bazarList]);

  // Filter & Sort
  const filteredBazar = useMemo(() => {
    let list = [...bazarList];

    if (filterShopper !== 'all') {
      list = list.filter((b) => b.memberId === filterShopper);
    }

    list.sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.date) - new Date(a.date);
      if (sortBy === 'date-asc') return new Date(a.date) - new Date(b.date);
      if (sortBy === 'amount-desc') return Number(b.amount) - Number(a.amount);
      if (sortBy === 'amount-asc') return Number(a.amount) - Number(b.amount);
      return 0;
    });

    return list;
  }, [bazarList, filterShopper, sortBy]);

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await bazarService.deleteBazar(deletingId);
      showToast('Bazar entry deleted', 'info');
      setDeletingId(null);
      await Promise.all([fetchBazar(), refreshAllMessData()]);
    } catch (err) {
      showToast(err.message || 'Failed to delete entry', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleApprove = async (id, status) => {
    try {
      await bazarService.approveBazar(id, { status });
      showToast(`Bazar ${status.toLowerCase()}!`, 'success');
      await Promise.all([fetchBazar(), refreshAllMessData()]);
    } catch (err) {
      showToast(err.message || 'Action failed', 'error');
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Header & Controls */}
      <div className="surface-card space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-bold text-DynamicSec uppercase tracking-wider">
              Bazar Expense Log
            </h2>
            <p className="text-xs text-DynamicMuted mt-0.5">
              Approved: <strong className="text-emerald-400">৳{approvedTotal.toFixed(2)}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAddBazar}
            className="tap-active px-2.5 py-1.5 theme-btn-primary sharp-xs text-xs font-semibold flex items-center gap-1 shadow-xs transition whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Bazar</span>
          </button>
        </div>

        {/* Filter & Sort Controls */}
        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-700/30">
          <div>
            <label className="block text-[10px] font-semibold text-DynamicMuted mb-0.5">
              Filter Shopper
            </label>
            <select
              value={filterShopper}
              onChange={(e) => setFilterShopper(e.target.value)}
              className="w-full px-2 py-1 text-xs surface-input sharp-xs"
            >
              <option value="all">All Shoppers</option>
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

      {/* Bazar Entries List */}
      <div className="space-y-1.5">
        {filteredBazar.map((item) => {
          const isUserOwner = item.memberId === activeMemberId;
          const canEdit = isManager || (isUserOwner && item.status !== 'APPROVED');
          const canDelete = isManager || (isUserOwner && item.status !== 'APPROVED');
          const isApproved = item.status === 'APPROVED';
          const isPending = item.status === 'PENDING';

          return (
            <div
              key={item.id}
              className="p-2.5 surface-card space-y-1.5 border border-slate-800"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-DynamicMain">
                    <span className="truncate">{item.member?.user?.name || 'Member'}</span>
                    <span className="text-emerald-400 font-extrabold shrink-0">
                      ৳{Number(item.amount).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[10px] text-DynamicMuted truncate mt-0.5">
                    {item.category || 'Groceries'} • {new Date(item.date).toLocaleDateString()}
                    {item.notes ? ` • ${item.notes}` : ''}
                  </p>
                </div>

                {/* Status Badge & Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`px-1.5 py-0.5 sharp-xs text-[9px] font-bold ${
                      isApproved
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : isPending
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {item.status}
                  </span>

                  {/* Manager Approval Controls */}
                  {isManager && isPending && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleApprove(item.id, 'APPROVED')}
                        className="tap-active p-1 bg-emerald-600/80 hover:bg-emerald-600 text-white sharp-xs"
                        title="Approve"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprove(item.id, 'REJECTED')}
                        className="tap-active p-1 bg-rose-600/80 hover:bg-rose-600 text-white sharp-xs"
                        title="Reject"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Edit Button */}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setEditingBazar(item)}
                      className="tap-active px-1.5 py-0.5 surface-input sharp-xs text-[10px] font-bold text-DynamicSec hover:text-DynamicMain border flex items-center gap-1"
                      title="Edit Bazar Entry"
                    >
                      <Edit3 className="w-3 h-3 text-indigo-400" />
                      <span>Edit</span>
                    </button>
                  )}

                  {/* Delete Button */}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setDeletingId(item.id)}
                      className="tap-active p-1 text-DynamicMuted hover:text-rose-400 sharp-xs"
                      title="Delete Bazar Entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Checklist Items if Mode 2 */}
              {Array.isArray(item.items) && item.items.length > 0 && (
                <div className="p-1.5 surface-subtle sharp-xs text-[10px] space-y-0.5 mt-1 border border-slate-700/20">
                  <span className="block font-bold text-DynamicMuted uppercase text-[9px]">
                    Itemized Checklist:
                  </span>
                  {item.items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between text-DynamicSec">
                      <span>• {it.name} {it.qty ? `(${it.qty})` : ''}</span>
                      <span className="font-semibold">৳{Number(it.price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filteredBazar.length === 0 && (
          <p className="text-xs text-center text-DynamicMuted py-4">
            No bazar expenses recorded for this month yet.
          </p>
        )}
      </div>

      {/* Edit Bazar Modal */}
      <EditBazarModal
        isOpen={Boolean(editingBazar)}
        onClose={() => setEditingBazar(null)}
        bazar={editingBazar}
        onSuccess={fetchBazar}
      />

      {/* Custom Confirm Delete Modal (Confirm on LEFT, Cancel on RIGHT) */}
      <ConfirmModal
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Bazar Entry"
        message="Are you sure you want to delete this bazar entry? If approved, it will be deducted from the mess expense total."
        confirmText="Yes, Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
      />
    </div>
  );
}
