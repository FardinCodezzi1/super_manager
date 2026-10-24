import { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useMess } from '../../context/MessContext';
import { depositService } from '../../services/depositService';
import { showToast } from '../common/Toast';

export function EditDepositModal({ isOpen, onClose, deposit, onSuccess }) {
  const { members, refreshAllMessData } = useMess();

  const [memberId, setMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (deposit) {
      setMemberId(deposit.memberId || deposit.member?.id || '');
      setAmount(String(deposit.amount ?? ''));
      setDate(deposit.date ? deposit.date.split('T')[0] : '');
      setNotes(deposit.notes || '');
    }
  }, [deposit, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      showToast('Please enter a valid positive amount', 'error');
      return;
    }
    if (!memberId) {
      showToast('Please select a member', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await depositService.updateDeposit(deposit.id, {
        memberId,
        amount: numAmount,
        date: date ? date + 'T12:00:00.000Z' : undefined,
        notes: notes.trim() || undefined,
      });

      showToast('Deposit record updated successfully!', 'success');
      onClose();
      if (onSuccess) onSuccess();
      await refreshAllMessData();
    } catch (err) {
      showToast(err.message || 'Failed to update deposit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!deposit) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Deposit Record"
      subtitle="Correct wrong amount or typo in deposit"
      maxWidth="max-w-sm"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
            Mess Member
          </label>
          <select
            required
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
          >
            {members
              .filter((m) => m.status === 'ACTIVE')
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.user?.name || 'Member'} ({m.user?.email || ''})
                </option>
              ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
              Amount (৳)
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-2 py-1.5 text-xs surface-input sharp-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
              Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
            Notes (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Bank transfer, cash"
            className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="tap-active w-full py-2 theme-btn-primary sharp-xs text-xs font-bold whitespace-nowrap disabled:opacity-50"
        >
          {submitting ? 'Updating...' : 'Save Changes'}
        </button>
      </form>
    </Modal>
  );
}
