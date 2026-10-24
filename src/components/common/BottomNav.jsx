import { Calendar, BarChart3, ShoppingBag, Wallet } from 'lucide-react';

export function BottomNav({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'daily', label: 'Daily', icon: Calendar },
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'bazar', label: 'Bazar', icon: ShoppingBag },
    { id: 'deposits', label: 'Deposits', icon: Wallet },
  ];

  return (
    <nav className="bottom-nav">
      <div className="max-w-2xl mx-auto px-1.5 py-1 grid grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`tap-active py-1 sharp-xs flex flex-col items-center justify-center gap-0.5 text-[10px] sm:text-[11px] transition whitespace-nowrap ${
                isActive ? 'nav-tab-active' : 'text-DynamicMuted'
              }`}
            >
              <div className="nav-indicator px-3 py-0.5 sharp-xs transition">
                <Icon className="w-4 h-4" />
              </div>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
