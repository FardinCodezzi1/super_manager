import { useState } from 'react';
import { Home, UserPlus } from 'lucide-react';
import { messService } from '../../services/messService';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../common/Toast';

export function MealOnboarding() {
  const [newMessName, setNewMessName] = useState('');
  const [rotationType, setRotationType] = useState('MONTHLY'); // 'MONTHLY' | 'WEEKLY'
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const { refreshMe } = useAuth();

  const handleCreateMess = async (e) => {
    e.preventDefault();
    if (!newMessName.trim()) {
      showToast('Please enter a mess name', 'error');
      return;
    }
    setCreating(true);
    try {
      await messService.createMess({ name: newMessName.trim() });

      // If user selected Weekly rotation, update the sequence rotation setting
      if (rotationType === 'WEEKLY') {
        try {
          const seq = await messService.getManagerSequence();
          if (seq?.sequence && seq.sequence.length > 0) {
            const memberIds = seq.sequence.map((s) => s.memberId);
            await messService.updateManagerSequence({
              memberIds,
              rotationType: 'WEEKLY',
              reason: 'Initial mess rotation schedule set to Weekly',
            });
          }
        } catch {
          // Non-fatal fallback
        }
      }

      showToast('Mess created successfully! You are the Manager.', 'success');
      await refreshMe();
    } catch (err) {
      showToast(err.message || 'Failed to create mess', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinMess = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      showToast('Please enter an invite code', 'error');
      return;
    }
    setJoining(true);
    try {
      await messService.joinMess({ inviteCode: joinCode.trim().toUpperCase() });
      showToast('Joined mess successfully!', 'success');
      await refreshMe();
    } catch (err) {
      showToast(err.message || 'Failed to join mess', 'error');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="surface-card p-4 text-center space-y-3">
      <div className="w-10 h-10 sharp-xs theme-btn-primary mx-auto flex items-center justify-center">
        <Home className="w-5 h-5" />
      </div>

      <div>
        <h2 className="text-sm font-bold text-DynamicMain">You Are Not in Any Active Mess</h2>
        <p className="text-xs text-DynamicMuted mt-0.5">
          Create your own mess as Manager or enter an invite code to join your roommates.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-left">
        {/* Create Mess Card */}
        <form onSubmit={handleCreateMess} className="surface-subtle p-3 sharp-xs space-y-2">
          <div className="flex items-center gap-1.5">
            <Home className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-DynamicMain">Create a New Mess</h3>
          </div>
          <p className="text-[10px] text-DynamicMuted leading-relaxed">
            You become the Mess Manager with full authority to record deposits and manage rotation.
          </p>
          <input
            type="text"
            required
            value={newMessName}
            onChange={(e) => setNewMessName(e.target.value)}
            placeholder="e.g. Green Valley Mess"
            className="w-full px-2.5 py-1.5 text-xs surface-card sharp-xs focus:outline-none"
          />

          <div>
            <label className="block text-[10px] font-semibold text-DynamicMuted mb-1">
              Duty Rotation Term
            </label>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setRotationType('MONTHLY')}
                className={`tap-active py-1 text-[11px] font-bold sharp-xs text-center border transition ${rotationType === 'MONTHLY'
                  ? 'theme-btn-primary'
                  : 'surface-card border-slate-700 text-DynamicSec'
                  }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setRotationType('WEEKLY')}
                className={`tap-active py-1 text-[11px] font-bold sharp-xs text-center border transition ${rotationType === 'WEEKLY'
                  ? 'theme-btn-primary'
                  : 'surface-card border-slate-700 text-DynamicSec'
                  }`}
              >
                Weekly
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="tap-active w-full py-1.5 theme-btn-primary sharp-xs text-xs font-semibold whitespace-nowrap disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Mess'}
          </button>
        </form>

        {/* Join Mess Card */}
        <form onSubmit={handleJoinMess} className="surface-subtle p-3 sharp-xs space-y-2">
          <div className="flex items-center gap-1.5">
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-DynamicMain">Join Existing Mess</h3>
          </div>
          <p className="text-[10px] text-DynamicMuted leading-relaxed">
            Enter the 5-character alphanumeric invite code shared by your manager.
          </p>
          <input
            type="text"
            required
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="e.g. MESS-TKQF5"
            className="w-full px-2.5 py-1.5 text-xs surface-card sharp-xs focus:outline-none"
          />
          <button
            type="submit"
            disabled={joining}
            className="tap-active w-full py-1.5 theme-btn-primary sharp-xs text-xs font-semibold whitespace-nowrap disabled:opacity-50"
          >
            {joining ? 'Joining...' : 'Join Mess'}
          </button>
        </form>
      </div>
    </div>
  );
}
