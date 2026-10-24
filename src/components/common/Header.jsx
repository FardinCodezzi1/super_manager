import { Share2, User, Moon, Sun, Utensils, Plane, ClipboardList, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useMess } from '../../context/MessContext';

export function Header({
  activeSuite,
  setActiveSuite,
  onOpenSettings,
  onOpenCreator,
  onShare,
  appName = 'Mess Meal Manager',
}) {
  const { currentUser } = useAuth();
  const { activeMess, currentMonthKey } = useMess();
  const { themeConfig, toggleMode } = useTheme();

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  return (
    <header className="bg-slate-900/60 backdrop-blur border-b border-slate-800/80 sticky top-0 z-30">
      <div className="max-w-2xl mx-auto px-3 pt-2 pb-1.5 space-y-1.5">
        {/* Tier 1: Brand & Top Action Bar */}
        <div className="flex items-center justify-between gap-2">
          {/* Logo & Dynamic Title */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 sharp-xs theme-btn-primary flex items-center justify-center shrink-0 shadow-xs">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 15h4" />
                <path d="M19.424 11.095a2.5 2.5 0 00.471-2.309 2 2 0 00.424-3.286 2 2 0 00-2.143-3.322 2 2 0 00-.676.502 2 2 0 00-3.287.424 2.5 2.5 0 00-3.189 2.06A3 3 0 0012 11l4-4" />
                <path d="M4 12.006A1 1 0 014.994 11H19a1 1 0 011 1v7a2 2 0 01-2 2H6a2 2 0 01-2-2z" />
                <path d="M7 11a4 4 0 01-4-4V5a1 1 0 011-1h2a4 4 0 013.584 2.222" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-extrabold text-DynamicMain leading-tight truncate">
                {appName}
              </h1>
              <p className="text-[10px] text-DynamicMuted leading-none truncate">
                {activeMess ? `${activeMess.name} • ${currentMonthKey}` : 'No Active Mess'}
              </p>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Global Context-Aware Share Button (Tactile 3D) */}
            {activeSuite !== 'notes' && (
              <button
                type="button"
                onClick={onShare}
                className="btn-share-tactile"
                title="Share Summary"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Share</span>
              </button>
            )}

            {/* Creator Modal Trigger */}
            <button
              type="button"
              onClick={onOpenCreator}
              className="tap-active w-7 h-7 surface-subtle sharp-xs text-DynamicSec hover:text-DynamicMain flex items-center justify-center transition"
              title="About the Creator"
            >
              <User className="w-3.5 h-3.5 theme-text-primary" />
            </button>

            {/* Light / Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleMode}
              className="tap-active w-7 h-7 surface-subtle sharp-xs text-DynamicSec hover:text-DynamicMain flex items-center justify-center transition"
              title="Toggle Light / Dark"
            >
              {themeConfig.mode === 'dark' ? (
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              )}
            </button>

            {/* Settings & Profile Trigger */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="tap-active h-7 px-2 theme-bg-soft border sharp-xs flex items-center gap-1.5 transition"
              title="User Profile & Settings"
            >
              <div className="text-[10px] font-extrabold uppercase">
                {getInitials(currentUser?.name)}
              </div>
              <ChevronDown className="w-3 h-3 text-DynamicMuted" />
            </button>
          </div>
        </div>

        {/* Tier 2: Universal Suite Selector Bar */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1 border-t border-slate-700/30">
          <button
            type="button"
            onClick={() => setActiveSuite('meal')}
            className={`suite-pill tap-active py-1 px-2.5 sharp-xs text-[11px] flex items-center gap-1.5 ${
              activeSuite === 'meal' ? 'active' : ''
            }`}
          >
            <Utensils className="w-3.5 h-3.5 shrink-0" />
            <span>Meal Manager</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSuite('tour')}
            className={`suite-pill tap-active py-1 px-2.5 sharp-xs text-[11px] flex items-center gap-1.5 ${
              activeSuite === 'tour' ? 'active' : ''
            }`}
          >
            <Plane className="w-3.5 h-3.5 shrink-0" />
            <span>Tour Manager</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSuite('notes')}
            className={`suite-pill tap-active py-1 px-2.5 sharp-xs text-[11px] flex items-center gap-1.5 ${
              activeSuite === 'notes' ? 'active' : ''
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5 shrink-0" />
            <span>Personal Notes</span>
          </button>
        </div>
      </div>
    </header>
  );
}
