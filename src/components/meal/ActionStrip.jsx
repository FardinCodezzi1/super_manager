import { Plus, Users, Copy, Check, ShieldCheck, Share2 } from 'lucide-react';
import { useState } from 'react';
import { useMess } from '../../context/MessContext';
import { showToast } from '../common/Toast';

export function ActionStrip({ onOpenAddBazar, onOpenRotationModal }) {
  const { activeMess, members, isPastMonth } = useMess();
  const [copied, setCopied] = useState(false);

  const activeCount = members.filter((m) => m.status === 'ACTIVE').length;
  const inviteCode = activeMess?.inviteCode || 'MESS-XXXXX';

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      showToast('Mess invite code copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast(inviteCode, 'info');
    }
  };

  const handleShareWhatsApp = () => {
    if (!activeMess) return;
    const text = `Hey! Join our mess "${activeMess.name}" using invite code: ${activeMess.inviteCode}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="surface-card flex flex-wrap items-center justify-between gap-2 py-2 px-2.5">
      {/* Left Action Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Bazar Button (Disabled for past months) */}
        <button
          type="button"
          disabled={isPastMonth}
          onClick={isPastMonth ? undefined : onOpenAddBazar}
          className={`sharp-xs text-xs font-bold flex items-center gap-1 shadow-xs transition whitespace-nowrap px-3 py-1.5 ${isPastMonth
              ? 'opacity-40 cursor-not-allowed surface-subtle text-DynamicMuted border border-slate-700/30'
              : 'tap-active theme-btn-primary'
            }`}
          title={isPastMonth ? 'Disabled: cannot add bazar for a past archived month' : 'Add Bazar Record'}
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Bazar</span>
        </button>

        {/* Duty / Rotation Shortcut Button (Disabled for past months) */}
        <button
          type="button"
          disabled={isPastMonth}
          onClick={isPastMonth ? undefined : onOpenRotationModal}
          className={`sharp-xs text-xs font-bold flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1.5 border transition ${isPastMonth
              ? 'opacity-40 cursor-not-allowed surface-subtle text-DynamicMuted border-slate-700/30'
              : 'tap-active theme-bg-soft text-DynamicMain hover:border-indigo-400'
            }`}
          title={isPastMonth ? 'Disabled: manager duty rotation only applies to active month' : 'Manager Duty & Rotation Schedule'}
        >
          <ShieldCheck className={`w-3.5 h-3.5 ${isPastMonth ? 'text-slate-500' : 'text-indigo-400'}`} />
          <span>Duty</span>
          {activeMess?.rotationType && (
            <span className="px-1 py-0.2 text-[8px] uppercase tracking-wider font-extrabold surface-subtle border border-indigo-400/30 text-indigo-300 sharp-xs">
              {activeMess.rotationType === 'WEEKLY' ? 'Weekly' : 'Monthly'}
            </span>
          )}
        </button>
      </div>

      {/* Right Badges: Members & Clean Non-overflowing Invite Code */}
      <div className="flex items-center gap-1.5 shrink-0 max-w-full">
        {/* Members Count Badge */}
        <div className="px-2 py-1 surface-subtle sharp-xs text-xs font-semibold text-DynamicMain flex items-center gap-1 whitespace-nowrap border border-slate-700/40">
          <Users className="w-3.5 h-3.5 theme-text-primary shrink-0" />
          <span className="font-bold">{activeCount}</span>
        </div>

        {/* Invite Code Badge (Neat & Compact) */}
        <div className="px-2 py-1 surface-subtle sharp-xs text-xs font-semibold text-DynamicMain flex items-center gap-1.5 border border-slate-700/40">
          <button
            type="button"
            onClick={handleCopyCode}
            className="tap-active text-indigo-400 font-mono font-bold hover:underline flex items-center gap-1"
            title="Click to copy invite code"
          >
            <span>{inviteCode}</span>
            {copied ? (
              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
            ) : (
              <Copy className="w-3 h-3 text-indigo-400 shrink-0" />
            )}
          </button>

          {/* <span className="text-slate-600">|</span> */}

          {/* <button
            type="button"
            onClick={handleShareWhatsApp}
            className="tap-active text-emerald-400 hover:text-emerald-300 p-0.5"
            title="Share invite via WhatsApp"
          >
            <Share2 className="w-3 h-3" />
          </button> */}
        </div>
      </div>
    </div>
  );
}
