import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

/**
 * Reusable Confirmation Modal for Destructive / Negative Actions
 * Explicit Requirement: Confirm/Delete button MUST stay on the LEFT, Cancel on the RIGHT.
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed? This action cannot be undone.',
  confirmText = 'Yes, Delete',
  cancelText = 'Cancel',
  isDestructive = true,
  isLoading = false,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle="Please confirm your decision"
      maxWidth="max-w-xs"
    >
      <div className="space-y-3.5">
        <div className="flex items-start gap-2.5 surface-subtle p-3 sharp-xs border border-slate-700/40">
          <AlertTriangle
            className={`w-5 h-5 shrink-0 mt-0.5 ${
              isDestructive ? 'text-rose-400' : 'text-amber-400'
            }`}
          />
          <p className="text-xs text-DynamicSec leading-relaxed">{message}</p>
        </div>

        {/* Action Buttons: Confirm on LEFT, Cancel on RIGHT */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`tap-active w-full py-2 font-bold text-xs sharp-xs transition disabled:opacity-50 text-white ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-500 shadow-xs'
                : 'theme-btn-primary'
            }`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="tap-active w-full py-2 surface-subtle border border-slate-700 text-DynamicSec hover:text-DynamicMain font-bold text-xs sharp-xs transition"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
