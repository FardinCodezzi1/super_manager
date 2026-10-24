import { useState, useEffect } from 'react';
import { Plane, Plus, UserPlus, MapPin } from 'lucide-react';
import { tourService } from '../../services/tourService';
import { showToast } from '../common/Toast';

export function TourListView({ onSelectTour, onOpenCreateTour, onOpenJoinTour }) {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTours = async () => {
    setLoading(true);
    try {
      const res = await tourService.getTours();
      const list = Array.isArray(res) ? res : res?.tours || [];
      setTours(list);
    } catch (err) {
      showToast(err.message || 'Failed to load tours', 'error');
      setTours([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTours();
  }, []);

  return (
    <div className="space-y-2.5">
      {/* Tour Header Strip */}
      <div className="surface-card flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-bold text-DynamicMain uppercase tracking-wider">
            Tour Expense Manager
          </h2>
          <p className="text-[11px] text-DynamicMuted">
            Split vacation trips, tickets, hotels &amp; food
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onOpenCreateTour}
            className="tap-active px-2 py-1 theme-btn-primary sharp-xs text-xs font-semibold whitespace-nowrap flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Tour</span>
          </button>
          <button
            type="button"
            onClick={onOpenJoinTour}
            className="tap-active px-2 py-1 surface-subtle border text-DynamicMain sharp-xs text-xs font-semibold whitespace-nowrap flex items-center gap-1"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Join Tour</span>
          </button>
        </div>
      </div>

      {/* Tours List */}
      <div className="space-y-2">
        {Array.isArray(tours) &&
          tours.map((tour) => {
            const balance = Number(tour.balance) || 0;
            const totalExpenses = Number(tour.totalExpenses) || 0;
            const totalDeposits = Number(tour.totalDeposits) || 0;

            return (
              <div
                key={tour.id}
                onClick={() => onSelectTour(tour.id)}
                className="tap-active p-3 surface-card border border-slate-800 hover:border-indigo-500/50 space-y-2 transition cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-DynamicMain truncate">
                      {tour.name}
                    </h3>
                    {tour.destination && (
                      <p className="text-[10px] text-DynamicMuted flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span>{tour.destination}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-1.5 py-0.5 text-[9px] font-bold surface-subtle border text-DynamicSec sharp-xs">
                      {tour.status || 'PLANNING'}
                    </span>
                    <span className="px-1.5 py-0.5 text-[9px] font-bold theme-bg-soft border text-DynamicSec sharp-xs">
                      {tour.membersCount || tour.members?.length || 0} Members
                    </span>
                  </div>
                </div>

                {/* Financial Snapshot */}
                <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-700/30 text-center">
                  <div className="surface-subtle p-1 sharp-xs">
                    <span className="text-[9px] text-DynamicMuted uppercase font-bold">Deposited</span>
                    <p className="text-xs font-bold text-DynamicMain">৳{totalDeposits.toFixed(2)}</p>
                  </div>
                  <div className="surface-subtle p-1 sharp-xs">
                    <span className="text-[9px] text-DynamicMuted uppercase font-bold">Spent</span>
                    <p className="text-xs font-bold text-DynamicMain">৳{totalExpenses.toFixed(2)}</p>
                  </div>
                  <div className="surface-subtle p-1 sharp-xs">
                    <span className="text-[9px] text-DynamicMuted uppercase font-bold">Treasury</span>
                    <p className="text-xs font-extrabold text-emerald-400">৳{balance.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            );
          })}

        {(!Array.isArray(tours) || tours.length === 0) && !loading && (
          <div className="surface-card p-6 text-center space-y-2">
            <Plane className="w-8 h-8 mx-auto text-DynamicMuted opacity-50" />
            <p className="text-xs text-DynamicMuted">You have not joined or created any tour trips yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
