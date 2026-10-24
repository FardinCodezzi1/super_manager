import { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useMess } from '../../context/MessContext';
import { bazarService } from '../../services/bazarService';
import { showToast } from '../common/Toast';

export function EditBazarModal({ isOpen, onClose, bazar, onSuccess }) {
  const { refreshAllMessData } = useMess();

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (bazar) {
      setAmount(String(bazar.amount ?? ''));
      setCategory(bazar.category || 'Groceries');
      setDate(bazar.date ? bazar.date.split('T')[0] : '');
      setNotes(bazar.notes || '');
    }
  }, [bazar, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      showToast('Please enter a valid positive amount', 'error');
      return;
    }
    if (!category.trim()) {
      showToast('Category is required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await bazarService.updateBazar(bazar.id, {
        amount: numAmount,
        category: category.trim(),
        date: date ? date + 'T12:00:00.000Z' : undefined,
        notes: notes.trim() || undefined,
      });

      showToast('Bazar entry updated successfully!', 'success');
      onClose();
      if (onSuccess) onSuccess();
      await refreshAllMessData();
    } catch (err) {
      showToast(err.message || 'Failed to update bazar entry', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!bazar) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Bazar Entry"
      subtitle="Correct wrong amount, category, or date"
      maxWidth="max-w-sm"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="surface-subtle p-2 sharp-xs flex items-center justify-between border border-slate-700/40 text-[11px]">
          <span className="text-DynamicMuted">Shopper:</span>
          <span className="font-bold text-DynamicMain">
            {bazar.member?.user?.name || 'Member'}
          </span>
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
            Category
          </label>
          <input
            type="text"
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Vegetables, Meat, Fish, Spices"
            className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
            Notes (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Receipt verified"
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
