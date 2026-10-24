import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { messService } from '../services/messService';
import { summaryService } from '../services/summaryService';
import { bazarService } from '../services/bazarService';
import { mealService } from '../services/mealService';

const MessContext = createContext(null);

export function MessProvider({ children }) {
  const { activeMembership } = useAuth();
  const activeMess = activeMembership?.mess || null;
  const isManager = activeMembership?.role === 'MANAGER';

  const [currentMonthKey, setCurrentMonthKey] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [members, setMembers] = useState([]);
  const [months, setMonths] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pendingBazar, setPendingBazar] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshAllMessData = useCallback(async () => {
    if (!activeMess) {
      setMembers([]);
      setMonths([]);
      setSummary(null);
      setPendingBazar([]);
      setPendingLeaves([]);
      return;
    }

    setIsLoading(true);
    try {
      const [membersRes, monthsRes, summaryRes] = await Promise.all([
        messService.getMembers(activeMess.id).catch(() => ({ members: [] })),
        messService.getMonths().catch(() => ({ months: [] })),
        summaryService.getSummary(currentMonthKey).catch(() => null),
      ]);

      setMembers(membersRes.members || []);
      setMonths(monthsRes.months || []);
      setSummary(summaryRes);

      // If user is manager, also fetch pending approvals
      if (isManager) {
        const [bazarRes, leavesRes] = await Promise.all([
          bazarService.getBazar({ monthKey: currentMonthKey }).catch(() => ({ entries: [] })),
          mealService.getLeaveRequests().catch(() => ({ leaveRequests: [] })),
        ]);
        const allBazar = bazarRes.entries || [];
        const allLeaves = leavesRes.leaveRequests || [];
        setPendingBazar(allBazar.filter((b) => b.status === 'PENDING'));
        setPendingLeaves(allLeaves.filter((l) => l.status === 'PENDING'));
      } else {
        setPendingBazar([]);
        setPendingLeaves([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [activeMess, isManager, currentMonthKey]);

  useEffect(() => {
    refreshAllMessData();
  }, [refreshAllMessData]);

  return (
    <MessContext.Provider
      value={{
        activeMess,
        isManager,
        activeMemberId: activeMembership?.id,
        currentMonthKey,
        setCurrentMonthKey,
        members,
        months,
        summary,
        pendingBazar,
        pendingLeaves,
        setPendingBazar,
        setPendingLeaves,
        isLoading,
        refreshAllMessData,
      }}
    >
      {children}
    </MessContext.Provider>
  );
}

export function useMess() {
  const context = useContext(MessContext);
  if (!context) throw new Error('useMess must be used within a MessProvider');
  return context;
}
