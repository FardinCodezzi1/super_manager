import { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MessProvider, useMess } from './context/MessContext';
import { configService } from './services/configService';
import { tourService } from './services/tourService';
import { copyText } from './utils/clipboard';

// Common Components
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { ToastContainer, showToast } from './components/common/Toast';

// Auth Screen
import { AuthScreen } from './components/auth/AuthScreen';

// Meal Manager Components
import { MealOnboarding } from './components/meal/MealOnboarding';
import { ActionStrip } from './components/meal/ActionStrip';
import { MonthSwitcher } from './components/meal/MonthSwitcher';
import { PendingApprovalsBanner } from './components/meal/PendingApprovalsBanner';
import { DailyMealsView } from './components/meal/DailyMealsView';
import { OverviewView } from './components/meal/OverviewView';
import { BazarView } from './components/meal/BazarView';
import { DepositsView } from './components/meal/DepositsView';
import { DutyRotationModal } from './components/meal/DutyRotationModal';
import { LeaveBreakModal } from './components/meal/LeaveBreakModal';
import { AddBazarModal } from './components/meal/AddBazarModal';
import { AddDepositModal } from './components/meal/AddDepositModal';

// Tour Manager Components
import { TourListView } from './components/tour/TourListView';
import { TourDetailView } from './components/tour/TourDetailView';
import { CreateTourModal, JoinTourModal } from './components/tour/TourModals';

// Personal Notes Components
import { NotesView } from './components/notes/NotesView';
import { NoteModal } from './components/notes/NoteModal';

// App Modals
import { SettingsModal } from './components/modals/SettingsModal';
import { CreatorModal } from './components/modals/CreatorModal';
import { UserManualModal } from './components/modals/UserManualModal';

function AppContent() {
  const { currentUser, isLoading } = useAuth();
  const { activeMess, currentMonthKey, summary, refreshAllMessData } = useMess();

  // Active Suite: 'meal' | 'tour' | 'notes'
  const [activeSuite, setActiveSuite] = useState('meal');

  // Active Tab for Meal Manager: 'daily' | 'overview' | 'bazar' | 'deposits'
  const [activeMealTab, setActiveMealTab] = useState('daily');

  // Selected Tour for Tour Detail
  const [selectedTourId, setSelectedTourId] = useState(null);

  // App Modals State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isRotationOpen, setIsRotationOpen] = useState(false);
  const [isLeaveBreakOpen, setIsLeaveBreakOpen] = useState(false);
  const [isAddBazarOpen, setIsAddBazarOpen] = useState(false);
  const [isAddDepositOpen, setIsAddDepositOpen] = useState(false);
  const [depositMemberId, setDepositMemberId] = useState(null);

  // Tour Modals State
  const [isCreateTourOpen, setIsCreateTourOpen] = useState(false);
  const [isJoinTourOpen, setIsJoinTourOpen] = useState(false);

  // Notes Modal State
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteToEdit, setNoteToEdit] = useState(null);
  const [notesRefreshKey, setNotesRefreshKey] = useState(0);

  // App Remote Config
  const [appName, setAppName] = useState('Mess Meal Manager');
  const [broadcastNotice, setBroadcastNotice] = useState(null);

  useEffect(() => {
    configService
      .getAppConfig()
      .then((res) => {
        if (res?.config?.appName) setAppName(res.config.appName);
        if (res?.config?.noticeActive && res?.config?.broadcastNotice) {
          setBroadcastNotice(res.config.broadcastNotice);
        }
      })
      .catch(() => null);
  }, []);

  // Update body padding when bottom nav is visible
  useEffect(() => {
    if (activeSuite === 'meal' && activeMess) {
      document.body.classList.add('has-bottom-nav');
    } else {
      document.body.classList.remove('has-bottom-nav');
    }
  }, [activeSuite, activeMess]);

  // Global Context-Aware Share Handler
  const handleGlobalShare = async () => {
    if (activeSuite === 'meal' && activeMess && summary) {
      const mealRate = Number(summary?.mealRate ?? summary?.financials?.mealRate ?? 0);
      const totalMeals = Number(summary?.totalMeals ?? summary?.financials?.totalMeals ?? 0);
      const totalApprovedBazar = Number(summary?.totalApprovedBazar ?? summary?.financials?.totalApprovedBazar ?? 0);
      const totalDeposits = Number(summary?.totalDeposits ?? summary?.financials?.totalDeposits ?? 0);
      const memberSummaries = summary?.memberSummaries || summary?.membersSummary || [];

      let text = `📊 *${activeMess.name} - Meal Summary*\n`;
      text += `📅 Month: ${currentMonthKey}\n`;
      text += `--------------------------------\n`;
      text += `🍲 Meal Rate: ৳${mealRate.toFixed(2)}\n`;
      text += `🍽️ Total Meals: ${totalMeals.toFixed(1)}\n`;
      text += `🛒 Approved Bazar: ৳${totalApprovedBazar.toFixed(2)}\n`;
      text += `💰 Total Deposits: ৳${totalDeposits.toFixed(2)}\n`;
      text += `--------------------------------\n`;
      text += `*Roommate Balances:*\n`;

      memberSummaries.forEach((m) => {
        const bal = Number(m.balance) || 0;
        const status = bal >= 0 ? `+৳${bal.toFixed(2)} (Refund)` : `-৳${Math.abs(bal).toFixed(2)} (Due)`;
        text += `• ${m.name}: Meals: ${m.totalMeals} | Deposit: ৳${Number(m.totalDeposit || 0).toFixed(2)} | Cost: ৳${Number(m.mealCost || 0).toFixed(2)} | Balance: ${status}\n`;
      });

      const success = await copyText(text);
      if (success) {
        showToast('Meal summary copied for WhatsApp / SMS!', 'success');
      } else {
        showToast('Failed to copy meal summary', 'error');
      }
    } else if (activeSuite === 'tour') {
      if (selectedTourId) {
        try {
          const res = await tourService.getTourById(selectedTourId);
          const tour = res?.tour || res;
          const sm = res?.summary || res;
          const mems = res?.members || res?.membersSummary || tour.members || [];
          const perShare = Number(sm.perMemberShare || 0);

          let rep = `✈️ *Tour Expense Report - ${tour.name}*\n`;
          if (tour.destination) rep += `📍 Destination: ${tour.destination}\n`;
          rep += `--------------------------------\n`;
          rep += `💰 Total Treasury Collected: ৳${Number(sm.totalDeposits || 0).toFixed(2)}\n`;
          rep += `💸 Total Trip Expenses: ৳${Number(sm.totalExpenses || 0).toFixed(2)}\n`;
          rep += `💵 Remaining Treasury Cash: ৳${Number(sm.balance || 0).toFixed(2)}\n`;
          rep += `⚖️ Equal Share Per Person: ৳${perShare.toFixed(2)}\n`;
          rep += `--------------------------------\n`;
          rep += `*Participant Settlement:*\n`;
          mems.forEach((m) => {
            const bal = Number(m.netBalance || 0);
            const status = bal >= 0 ? `+৳${bal.toFixed(2)} (Refund)` : `-৳${Math.abs(bal).toFixed(2)} (Due)`;
            rep += `• ${m.name || m.user?.name || 'Participant'}: Paid: ৳${Number(m.totalDeposited || 0).toFixed(2)} | Net: ${status}\n`;
          });

          await copyText(rep);
          showToast('Tour report copied to clipboard for WhatsApp!', 'success');
          return;
        } catch {
          // fallback
        }
      }

      // If no tour selected, copy list of all tours
      try {
        const res = await tourService.getTours();
        const tours = res?.tours || (Array.isArray(res) ? res : []);
        if (tours.length === 0) {
          showToast('No tours available to share', 'info');
          return;
        }
        let text = `✈️ *My Tour Trips - Super Manager*\n`;
        text += `--------------------------------\n`;
        tours.forEach((t) => {
          text += `• ${t.name}: Treasury: ৳${Number(t.balance || 0).toFixed(2)} | Spent: ৳${Number(t.totalExpenses || 0).toFixed(2)} (${t.status || 'PLANNING'})\n`;
        });
        await copyText(text);
        showToast('Tours list copied to clipboard!', 'success');
      } catch {
        showToast('Failed to copy tours list', 'error');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-950 text-white space-y-3">
        <div className="spinner w-8 h-8"></div>
        <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">
          Loading {appName}...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <ToastContainer />
        <AuthScreen appName={appName} />
      </>
    );
  }

  return (
    <div className="min-h-screen">
      <ToastContainer />

      {/* Global Broadcast Notice Banner (from /api/config) */}
      {broadcastNotice && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-300 text-xs py-2 px-3 flex items-center justify-between gap-2">
          <span className="truncate font-medium">{broadcastNotice}</span>
          <button
            onClick={() => setBroadcastNotice(null)}
            className="text-amber-400 hover:text-white font-bold px-1"
          >
            &times;
          </button>
        </div>
      )}

      {/* Two-Tier Sticky Header */}
      <Header
        appName={appName}
        activeSuite={activeSuite}
        setActiveSuite={(s) => {
          setActiveSuite(s);
          if (s === 'tour') setSelectedTourId(null);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCreator={() => setIsCreatorOpen(true)}
        onShare={handleGlobalShare}
      />

      {/* Main Workspace Container */}
      <main className="app-container space-y-2.5 pt-2 pb-6">
        {/* SUITE 1: MEAL MANAGER */}
        {activeSuite === 'meal' && (
          <div className="space-y-2.5">
            {!activeMess ? (
              <MealOnboarding />
            ) : (
              <div className="space-y-2.5">
                {/* Clean Action Strip */}
                <ActionStrip
                  onOpenAddBazar={() => setIsAddBazarOpen(true)}
                  onOpenRotationModal={() => setIsRotationOpen(true)}
                />

                {/* Month Switching System */}
                <MonthSwitcher />

                {/* Manager Approvals Alert Banner */}
                <PendingApprovalsBanner />

                {/* Tab Views */}
                {activeMealTab === 'daily' && (
                  <DailyMealsView onOpenLeaveBreak={() => setIsLeaveBreakOpen(true)} />
                )}
                {activeMealTab === 'overview' && (
                  <OverviewView
                    onOpenDepositForMember={(memberId) => {
                      setDepositMemberId(memberId);
                      setIsAddDepositOpen(true);
                    }}
                  />
                )}
                {activeMealTab === 'bazar' && (
                  <BazarView onOpenAddBazar={() => setIsAddBazarOpen(true)} />
                )}
                {activeMealTab === 'deposits' && (
                  <DepositsView onOpenAddDeposit={() => setIsAddDepositOpen(true)} />
                )}
              </div>
            )}
          </div>
        )}

        {/* SUITE 2: TOUR MANAGER */}
        {activeSuite === 'tour' && (
          <div className="space-y-2.5">
            {!selectedTourId ? (
              <TourListView
                onSelectTour={(id) => setSelectedTourId(id)}
                onOpenCreateTour={() => setIsCreateTourOpen(true)}
                onOpenJoinTour={() => setIsJoinTourOpen(true)}
              />
            ) : (
              <TourDetailView
                tourId={selectedTourId}
                onBack={() => setSelectedTourId(null)}
                onTourDeleted={() => setSelectedTourId(null)}
              />
            )}
          </div>
        )}

        {/* SUITE 3: PERSONAL NOTES */}
        {activeSuite === 'notes' && (
          <div className="space-y-2.5">
            <NotesView
              refreshKey={notesRefreshKey}
              onOpenAddNote={() => {
                setNoteToEdit(null);
                setIsNoteModalOpen(true);
              }}
              onEditNote={(note) => {
                setNoteToEdit(note);
                setIsNoteModalOpen(true);
              }}
            />
          </div>
        )}
      </main>

      {/* Floating Bottom Nav (Only for Meal Manager in an Active Mess) */}
      {activeSuite === 'meal' && activeMess && (
        <BottomNav activeTab={activeMealTab} setActiveTab={setActiveMealTab} />
      )}

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpenCreator={() => setIsCreatorOpen(true)}
        onOpenManual={() => setIsManualOpen(true)}
      />

      <CreatorModal isOpen={isCreatorOpen} onClose={() => setIsCreatorOpen(false)} />

      <UserManualModal isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} />

      <DutyRotationModal
        isOpen={isRotationOpen}
        onClose={() => setIsRotationOpen(false)}
      />

      <LeaveBreakModal
        isOpen={isLeaveBreakOpen}
        onClose={() => setIsLeaveBreakOpen(false)}
      />

      <AddBazarModal
        isOpen={isAddBazarOpen}
        onClose={() => setIsAddBazarOpen(false)}
        onSuccess={refreshAllMessData}
      />

      <AddDepositModal
        isOpen={isAddDepositOpen}
        onClose={() => {
          setIsAddDepositOpen(false);
          setDepositMemberId(null);
        }}
        defaultMemberId={depositMemberId}
        onSuccess={refreshAllMessData}
      />

      <CreateTourModal
        isOpen={isCreateTourOpen}
        onClose={() => setIsCreateTourOpen(false)}
        onSuccess={(newTour) => setSelectedTourId(newTour?.id || null)}
      />

      <JoinTourModal
        isOpen={isJoinTourOpen}
        onClose={() => setIsJoinTourOpen(false)}
        onSuccess={(joined) => setSelectedTourId(joined?.tour?.id || joined?.id || null)}
      />

      <NoteModal
        isOpen={isNoteModalOpen}
        onClose={() => {
          setIsNoteModalOpen(false);
          setNoteToEdit(null);
        }}
        noteToEdit={noteToEdit}
        onSuccess={() => setNotesRefreshKey((k) => k + 1)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MessProvider>
          <AppContent />
        </MessProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
