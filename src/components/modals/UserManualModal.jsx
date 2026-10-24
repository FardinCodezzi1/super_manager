import { Modal } from '../common/Modal';

export function UserManualModal({ isOpen, onClose }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="User Manual & App Guide"
      subtitle="Complete documentation of platform rules & workflows"
      maxWidth="max-w-lg"
    >
      <div className="space-y-3 pr-1 text-xs text-DynamicSec leading-relaxed">
        <div className="surface-subtle p-2.5 sharp-xs space-y-1 border border-slate-700/30">
          <h4 className="font-bold text-DynamicMain">1. One Active Mess Rule</h4>
          <p>
            Each user can belong to at most one active mess at any given time. When you leave a mess,
            your historical records (bazar entries, deposits, meals) are strictly preserved so your roommates'
            balance sheets never break.
          </p>
        </div>

        <div className="surface-subtle p-2.5 sharp-xs space-y-1 border border-slate-700/30">
          <h4 className="font-bold text-DynamicMain">2. Two-Mode Bazar Entry &amp; Approval Gating</h4>
          <p>
            <strong>Mode 1 (Quick Total):</strong> Enter a single total amount for fast logging.<br />
            <strong>Mode 2 (Market Checklist):</strong> Build an itemized grocery checklist with quantities and prices.
            Member submissions enter as <code>PENDING</code> and do not affect the official meal rate until the Manager approves them.
          </p>
        </div>

        <div className="surface-subtle p-2.5 sharp-xs space-y-1 border border-slate-700/30">
          <h4 className="font-bold text-DynamicMain">3. Manager Duty Rotation &amp; Anti-Cheat Transparency</h4>
          <p>
            The manager role automatically shifts to the next member in sequence when a new monthly cycle opens.
            Any member can execute an emergency manual override role transfer by stating a reason.
            Every rotation and transfer is written to an <strong>immutable audit log</strong> that all members can inspect,
            preventing anyone from cheating or dodging duty.
          </p>
        </div>

        <div className="surface-subtle p-2.5 sharp-xs space-y-1 border border-slate-700/30">
          <h4 className="font-bold text-DynamicMain">4. Temporary Meal Break</h4>
          <p>
            Going home for vacation? Submit a <strong>Meal Break</strong> with your date range.
            Once approved by the Manager, your lunch and dinner entries are automatically set to 0 for that duration.
          </p>
        </div>

        <div className="surface-subtle p-2.5 sharp-xs space-y-1 border border-slate-700/30">
          <h4 className="font-bold text-DynamicMain">5. Tour Expense Manager</h4>
          <p>
            Completely decoupled from mess life! Create trips, collect deposits into the treasury,
            log itemized expenses, add offline friends without accounts, and compute equal shares with live refund/due settlement.
          </p>
        </div>
      </div>
    </Modal>
  );
}
