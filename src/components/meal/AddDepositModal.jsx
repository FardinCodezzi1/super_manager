import { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useMess } from '../../context/MessContext';
import { depositService } from '../../services/depositService';
import { showToast } from '../common/Toast';

export function AddDepositModal({ isOpen, onClose, onSuccess, defaultMemberId }) {
  const { currentMonthKey, members } = useMess();

  const [memberId, setMemberId] = useState(defaultMemberId || '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (defaultMemberId) {
      setMemberId(defaultMemberId);
    }
  }, [defaultMemberId, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      showToast('Please enter a valid deposit amount', 'error');
      return;
    }
    if (!memberId) {
      showToast('Please select a member', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await depositService.createDeposit({
        monthKey: currentMonthKey,
        memberId,
        amount: numAmount,
        date: date + 'T12:00:00.000Z',
        notes: notes.trim() || undefined,
      });
      showToast('Deposit recorded successfully!', 'success');
      setAmount('');
      setNotes('');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast(err.message || 'Failed to record deposit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Member Deposit"
      subtitle="Cash or mobile banking collected into mess funds"
      maxWidth="max-w-sm"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
            Member
          </label>
          <select
            required
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
          >
            <option value="">Select Member</option>
            {members
              .filter((m) => m.status === 'ACTIVE')
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.user.name} ({m.user.email})
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
            placeholder="e.g. bKash cash-in, cash hand-to-hand"
            className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="tap-active w-full py-2 theme-btn-primary sharp-xs text-xs font-bold whitespace-nowrap disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Save Deposit'}
        </button>
      </form>
    </Modal>
  );
}
