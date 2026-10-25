import { useState, useEffect } from 'react';
import { Plus, Trash } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useMess } from '../../context/MessContext';
import { useAuth } from '../../context/AuthContext';
import { bazarService } from '../../services/bazarService';
import { showToast } from '../common/Toast';

export function AddBazarModal({ isOpen, onClose, onSuccess }) {
  const { currentMonthKey, activeMemberId, isManager } = useMess();
  const { currentUser } = useAuth();

  const [mode, setMode] = useState('quick'); // 'quick' | 'checklist'
  const [shopperId, setShopperId] = useState(activeMemberId || '');
  const [category, setCategory] = useState('Groceries');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [quickAmount, setQuickAmount] = useState('');

  // Mode 2 Checklist items
  const [checklistItems, setChecklistItems] = useState([]);
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('');
  const [itemPrice, setItemPrice] = useState('');

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeMemberId) {
      setShopperId(activeMemberId);
    }
  }, [activeMemberId, isOpen]);

  const handleAddChecklistItem = () => {
    if (!itemName.trim()) {
      showToast('Enter item name', 'error');
      return;
    }
    const priceNum = parseFloat(itemPrice) || 0;
    setChecklistItems((prev) => [
      ...prev,
      { name: itemName.trim(), qty: itemQty.trim() || '1', price: priceNum, bought: true },
    ]);
    setItemName('');
    setItemQty('');
    setItemPrice('');
  };

  const handleRemoveChecklistItem = (idx) => {
    setChecklistItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const checklistTotal = checklistItems.reduce((sum, it) => sum + (Number(it.price) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const amount = mode === 'quick' ? parseFloat(quickAmount) : checklistTotal;
    if (!amount || amount <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        monthKey: currentMonthKey,
        memberId: shopperId,
        amount,
        date: date + 'T12:00:00.000Z',
        category: category.trim() || 'Groceries',
        notes: notes.trim() || undefined,
        mode: mode.toUpperCase(),
        ...(mode === 'checklist' ? { items: checklistItems } : {}),
      };

      await bazarService.createBazar(payload);
      showToast('Bazar logged successfully!', 'success');
      setQuickAmount('');
      setNotes('');
      setChecklistItems([]);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast(err.message || 'Failed to record bazar', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Bazar Expense"
      subtitle="Choose Quick Total or Market Checklist"
      maxWidth="max-w-sm"
    >
      <div className="space-y-3">
        {/* Mode Selector */}
        <div className="grid grid-cols-2 p-1 surface-subtle sharp-xs gap-1">
          <button
            type="button"
            onClick={() => setMode('quick')}
            className={`tap-active py-1 text-xs font-bold sharp-xs text-center transition whitespace-nowrap ${mode === 'quick' ? 'theme-btn-primary' : 'text-DynamicMuted hover:text-DynamicMain'
              }`}
          >
            Mode 1: Quick Total
          </button>
          <button
            type="button"
            onClick={() => setMode('checklist')}
            className={`tap-active py-1 text-xs font-bold sharp-xs text-center transition whitespace-nowrap ${mode === 'checklist' ? 'theme-btn-primary' : 'text-DynamicMuted hover:text-DynamicMain'
              }`}
          >
            Mode 2: Checklist
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2.5">
          {/* Submitter & Auto-Approval Status Notice */}
          <div className="surface-subtle p-2 sharp-xs flex items-center justify-between border border-slate-700/40">
            <div>
              <span className="text-[10px] text-DynamicMuted uppercase font-bold">
                Shopper / Submitter
              </span>
              <p className="text-xs font-bold text-DynamicMain">
                {currentUser?.name || 'You'} {isManager ? '(Active Manager)' : '(Roommate Member)'}
              </p>
            </div>
            <span
              className={`px-1.5 py-0.5 text-[9px] font-bold sharp-xs uppercase ${isManager
                ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'
                : 'text-amber-400 bg-amber-500/10 border border-amber-500/30'
                }`}
            >
              {isManager ? 'Instant Auto-Approval' : 'Requires Approval'}
            </span>
          </div>
          {!isManager && (
            <p className="text-[10px] text-DynamicMuted -mt-1 leading-normal">
              Entries submitted by members require review &amp; approval from the active manager before being added to mess totals.
            </p>
          )}

          {/* Mode 1: Quick Total Fields */}
          {mode === 'quick' && (
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
                  value={quickAmount}
                  onChange={(e) => setQuickAmount(e.target.value)}
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
          )}

          {/* Mode 2: Market Checklist Item Creator */}
          {mode === 'checklist' && (
            <>
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

              <div className="surface-subtle p-2 sharp-xs space-y-1.5 border border-slate-700/40">
                <span className="block text-[10px] font-bold text-DynamicSec uppercase">
                  Add Grocery Item <span className="text-red-500 text-[9px]">(quantity doesn't multiply the price)</span>
                </span>
                <div className="grid grid-cols-5 gap-1">
                  <input
                    type="text"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="Item (e.g. Rice)"
                    className="col-span-2 px-1.5 py-1 text-xs surface-card sharp-xs focus:outline-none"
                  />
                  <input
                    type="text"
                    value={itemQty}
                    onChange={(e) => setItemQty(e.target.value)}
                    placeholder="Qty"
                    className="col-span-1 px-1.5 py-1 text-xs surface-card sharp-xs focus:outline-none"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    placeholder="৳Price"
                    className="col-span-1 px-1.5 py-1 text-xs surface-card sharp-xs font-bold focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddChecklistItem}
                    className="col-span-1 tap-active theme-btn-primary text-xs font-bold sharp-xs flex items-center justify-center"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Checklist Items list */}
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {checklistItems.map((it, idx) => (
                  <div
                    key={idx}
                    className="p-1.5 surface-subtle sharp-xs flex items-center justify-between text-[11px]"
                  >
                    <span>{it.name} ({it.qty})</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold">৳{Number(it.price).toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveChecklistItem(idx)}
                        className="text-rose-400 font-bold hover:text-rose-300 px-1"
                      >
                        <Trash className="w-3 h-3 mb-0.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-700/30 text-xs">
                <span className="font-bold text-DynamicSec">Total Calculated:</span>
                <span className="font-extrabold text-DynamicMain text-sm">
                  ৳{checklistTotal.toFixed(2)}
                </span>
              </div>
            </>
          )}

          {/* Category & Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Vegetables, Meat, Spices"
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
              placeholder="e.g. Local bazaar receipt"
              className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="tap-active w-full py-2 theme-btn-primary sharp-xs text-xs font-bold whitespace-nowrap disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Bazar Entry'}
          </button>
        </form>
      </div>
    </Modal>
  );
}
