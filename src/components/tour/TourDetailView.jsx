import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  Share2,
  Copy,
  Check,
  Plus,
  Trash2,
  Edit3,
  UserPlus,
  MapPin,
  Calendar,
  Search,
  Users,
} from 'lucide-react';
import { tourService } from '../../services/tourService';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../common/Toast';
import { copyText } from '../../utils/clipboard';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  AddTourExpenseModal,
  AddTourDepositModal,
  AddTourMemberModal,
  EditTourExpenseModal,
  EditTourDepositModal,
  EditTourModal,
} from './TourModals';

export function TourDetailView({ tourId, onBack, onTourDeleted }) {
  const { currentUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('settlement');
  const [copied, setCopied] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  // Local Modal States
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddDepositOpen, setIsAddDepositOpen] = useState(false);
  const [depositTargetMemberId, setDepositTargetMemberId] = useState(null);
  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
  const [isEditTourOpen, setIsEditTourOpen] = useState(false);

  // Edit Expense & Deposit States
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingDeposit, setEditingDeposit] = useState(null);

  // Confirm Deletion State
  const [deleteTarget, setDeleteTarget] = useState(null);
  // { type: 'expense' | 'deposit' | 'participant' | 'tour', id: string, name?: string }
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTour = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tourService.getTourById(tourId);
      setData(res);
    } catch (err) {
      showToast(err.message || 'Failed to load tour details', 'error');
    } finally {
      setLoading(false);
    }
  }, [tourId]);

  useEffect(() => {
    fetchTour();
  }, [fetchTour]);

  // Extract normalized fields regardless of backend return shape
  const tour = data?.tour || data;
  const summary = data?.summary || data;
  const members = useMemo(
    () => data?.members || data?.membersSummary || tour?.members || [],
    [data, tour]
  );
  const expenses = useMemo(
    () => data?.expenses || tour?.expenses || [],
    [data, tour]
  );
  const deposits = useMemo(
    () => data?.deposits || tour?.deposits || [],
    [data, tour]
  );

  const isCreator = tour?.creatorId === currentUser?.id || tour?.creator?.id === currentUser?.id;
  const userMembership = members.find(
    (m) =>
      m.userId === currentUser?.id ||
      (currentUser?.email && (m.email === currentUser.email || m.user?.email === currentUser.email))
  );
  const userRole = userMembership?.role || (isCreator ? 'LEAD' : 'MEMBER');
  const isLead = userRole === 'LEAD' || isCreator;
  const isAccountant = userRole === 'ACCOUNTANT';
  const canManageFunds = isLead || isAccountant || isCreator;

  const totalDeposits = Number(summary?.totalDeposits ?? tour?.totalDeposits ?? 0);
  const totalExpenses = Number(summary?.totalExpenses ?? tour?.totalExpenses ?? 0);
  const balance = Number(summary?.balance ?? tour?.balance ?? (totalDeposits - totalExpenses));
  const activeCount = members.length || 1;
  const perMemberShare = Number(
    summary?.perMemberShare ?? (activeCount > 0 ? totalExpenses / activeCount : 0)
  );

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members;
    const q = memberSearch.toLowerCase();
    return members.filter((m) => {
      const name = (m.name || m.user?.name || '').toLowerCase();
      const email = (m.email || m.user?.email || '').toLowerCase();
      const phone = (m.phone || m.user?.phone || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [members, memberSearch]);

  const handleCopyCode = async () => {
    if (!tour?.inviteCode) return;
    const success = await copyText(tour.inviteCode);
    if (success) {
      setCopied(true);
      showToast('Tour invite code copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } else {
      showToast(tour.inviteCode, 'info');
    }
  };

  const handleShareTourReport = async () => {
    if (!tour) return;
    let report = `✈️ *Tour Expense Report - ${tour.name}*\n`;
    if (tour.destination) report += `📍 Destination: ${tour.destination}\n`;
    report += `--------------------------------\n`;
    report += `💰 Total Treasury Collected: ৳${totalDeposits.toFixed(2)}\n`;
    report += `💸 Total Trip Expenses: ৳${totalExpenses.toFixed(2)}\n`;
    report += `💵 Remaining Treasury Cash: ৳${balance.toFixed(2)}\n`;
    report += `👥 Total Participants: ${activeCount}\n`;
    report += `⚖️ Equal Share Per Person: ৳${perMemberShare.toFixed(2)}\n`;
    report += `--------------------------------\n`;
    report += `*Participant Settlement:*\n`;

    members.forEach((m) => {
      const name = m.name || m.user?.name || 'Participant';
      const deposited =
        m.totalDeposited !== undefined
          ? Number(m.totalDeposited)
          : deposits
              .filter((d) => d.memberId === m.id)
              .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
      const net =
        m.netBalance !== undefined ? Number(m.netBalance) : deposited - perMemberShare;
      const status =
        net >= 0 ? `+৳${net.toFixed(2)} (Refund)` : `-৳${Math.abs(net).toFixed(2)} (Due)`;
      report += `• ${name}: Paid: ৳${deposited.toFixed(2)} | Balance: ${status}\n`;
    });

    const success = await copyText(report);
    if (success) {
      showToast('Tour financial report copied to clipboard for WhatsApp!', 'success');
    } else {
      showToast('Failed to copy report', 'error');
    }
  };

  const handlePromoteRole = async (memberId, newRole) => {
    try {
      await tourService.updateParticipantRole(tourId, memberId, { role: newRole });
      showToast(`Participant updated to ${newRole}`, 'success');
      fetchTour();
    } catch (err) {
      showToast(err.message || 'Role update failed', 'error');
    }
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      if (deleteTarget.type === 'expense') {
        await tourService.deleteExpense(tourId, deleteTarget.id);
        showToast('Expense deleted', 'info');
      } else if (deleteTarget.type === 'deposit') {
        await tourService.deleteDeposit(tourId, deleteTarget.id);
        showToast('Deposit record deleted', 'info');
      } else if (deleteTarget.type === 'participant') {
        await tourService.removeParticipant(tourId, deleteTarget.id);
        showToast('Participant removed from tour', 'info');
      } else if (deleteTarget.type === 'tour') {
        await tourService.deleteTour(tourId);
        showToast('Tour deleted', 'info');
        if (onTourDeleted) onTourDeleted();
        else if (onBack) onBack();
        return;
      }
      setDeleteTarget(null);
      await fetchTour();
    } catch (err) {
      showToast(err.message || 'Delete operation failed', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="surface-card p-6 text-center text-xs text-DynamicMuted space-y-2">
        <div className="spinner w-6 h-6 mx-auto"></div>
        <p>Loading tour details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Top Navigation & Actions Bar */}
      <div className="surface-card flex items-center justify-between gap-2 py-2 px-2.5">
        <button
          type="button"
          onClick={onBack}
          className="tap-active text-DynamicSec hover:text-DynamicMain flex items-center gap-1 text-xs font-bold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Tours</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleShareTourReport}
            className="btn-share-tactile"
            title="Share Tour Report"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Share Report</span>
          </button>

          <button
            type="button"
            onClick={handleCopyCode}
            className="tap-active px-2 py-1 surface-subtle sharp-xs text-[11px] font-mono font-bold text-indigo-400 border border-slate-700/40 flex items-center gap-1"
            title="Copy Tour Invite Code"
          >
            <span>{tour.inviteCode}</span>
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Tour Header Card */}
      <div className="surface-card space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-DynamicMain truncate">{tour.name}</h2>
            {tour.destination && (
              <p className="text-[11px] text-DynamicMuted flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-indigo-400 shrink-0" />
                <span>{tour.destination}</span>
              </p>
            )}
            {tour.startDate && (
              <p className="text-[10px] text-DynamicMuted flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3 text-indigo-400 shrink-0" />
                <span>
                  {new Date(tour.startDate).toLocaleDateString()}
                  {tour.endDate ? ` - ${new Date(tour.endDate).toLocaleDateString()}` : ''}
                </span>
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 text-[9px] font-bold surface-subtle border text-DynamicSec sharp-xs">
                {tour.status || 'PLANNING'}
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-bold theme-bg-soft border text-DynamicSec sharp-xs">
                {userRole}
              </span>
            </div>

            {/* Lead Controls: Edit Tour & Delete Tour */}
            {isLead && (
              <div className="flex items-center gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditTourOpen(true)}
                  className="tap-active p-1 text-DynamicMuted hover:text-DynamicMain sharp-xs"
                  title="Edit Tour Details"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDeleteTarget({
                      type: 'tour',
                      id: tour.id,
                      name: tour.name,
                    })
                  }
                  className="tap-active p-1 text-DynamicMuted hover:text-rose-400 sharp-xs"
                  title="Delete Tour"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Financial Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 border-t border-slate-700/30 text-center">
          <div className="surface-subtle p-2 sharp-xs">
            <span className="text-[9px] text-DynamicMuted uppercase font-bold">Total Expenses</span>
            <p className="text-xs font-extrabold text-DynamicMain">৳{totalExpenses.toFixed(2)}</p>
          </div>
          <div className="surface-subtle p-2 sharp-xs">
            <span className="text-[9px] text-DynamicMuted uppercase font-bold">Treasury Cash</span>
            <p className="text-xs font-extrabold text-emerald-400">৳{balance.toFixed(2)}</p>
          </div>
          <div className="surface-subtle p-2 sharp-xs">
            <span className="text-[9px] text-DynamicMuted uppercase font-bold">Equal Share / Person</span>
            <p className="text-xs font-extrabold text-indigo-400">৳{perMemberShare.toFixed(2)}</p>
          </div>
          <div className="surface-subtle p-2 sharp-xs">
            <span className="text-[9px] text-DynamicMuted uppercase font-bold">Total Collected</span>
            <p className="text-xs font-extrabold text-DynamicMain">৳{totalDeposits.toFixed(2)}</p>
          </div>
        </div>

        {/* PRIMARY ACTION BUTTON BAR: Always Visible */}
        <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-slate-700/30">
          <button
            type="button"
            onClick={() => {
              if (!canManageFunds) {
                showToast('Only Tour Lead or Accountant can record expenses', 'warning');
                return;
              }
              setIsAddExpenseOpen(true);
            }}
            className="tap-active py-1.5 px-2 sharp-xs text-xs font-bold flex items-center justify-center gap-1 bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 transition shadow-xs"
            title="Record trip expense (Food, hotel, transport)"
          >
            <Plus className="w-3.5 h-3.5 text-rose-400" />
            <span>Add Expense</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!canManageFunds) {
                showToast('Only Tour Lead or Accountant can record deposits', 'warning');
                return;
              }
              setDepositTargetMemberId(null);
              setIsAddDepositOpen(true);
            }}
            className="tap-active py-1.5 px-2 sharp-xs text-xs font-bold flex items-center justify-center gap-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition shadow-xs"
            title="Record member deposit into tour treasury"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add Deposit</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!canManageFunds) {
                showToast('Only Tour Lead or Accountant can add participants', 'warning');
                return;
              }
              setIsAddParticipantOpen(true);
            }}
            className="tap-active py-1.5 px-2 sharp-xs text-xs font-bold flex items-center justify-center gap-1 bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 transition shadow-xs"
            title="Add a new member or friend to this tour"
          >
            <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Sub-Tabs: Balances, Expenses, Deposits, Members */}
      <div className="surface-card p-1 grid grid-cols-4 gap-1 text-center">
        {[
          { id: 'settlement', label: 'Balances' },
          { id: 'expenses', label: `Expenses (${expenses.length})` },
          { id: 'deposits', label: `Deposits (${deposits.length})` },
          { id: 'participants', label: `Members (${members.length})` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`tap-active py-1.5 text-xs font-bold sharp-xs transition ${
              activeTab === t.id ? 'theme-btn-primary' : 'text-DynamicMuted hover:text-DynamicMain'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: SETTLEMENT / BALANCES */}
      {activeTab === 'settlement' && (
        <div className="surface-card space-y-2">
          <div className="flex items-center justify-between border-b pb-1.5" style={{ borderColor: 'var(--border-col)' }}>
            <div>
              <h3 className="text-xs font-bold text-DynamicMain uppercase tracking-wider">
                Participant Settlement
              </h3>
              <p className="text-[10px] text-DynamicMuted">Paid - Equal Share = Net Refund / Due</p>
            </div>
            <span className="text-[10px] font-bold theme-text-primary">
              Equal Share: ৳{perMemberShare.toFixed(2)}
            </span>
          </div>

          <div className="space-y-1.5">
            {members.map((m) => {
              const name = m.name || m.user?.name || 'Participant';
              const memberDeposits =
                m.totalDeposited !== undefined
                  ? Number(m.totalDeposited)
                  : deposits
                      .filter((d) => d.memberId === m.id)
                      .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
              const netBalance =
                m.netBalance !== undefined ? Number(m.netBalance) : memberDeposits - perMemberShare;
              const isRefund = netBalance >= 0;

              return (
                <div
                  key={m.id}
                  className="p-2 sharp-xs surface-subtle border border-slate-800 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-DynamicMain truncate">{name}</span>
                      <span className="px-1 py-0.2 sharp-xs text-[9px] font-bold surface-card border text-DynamicMuted">
                        {m.role}
                      </span>
                      {m.userId === null && (
                        <span className="px-1 py-0.2 sharp-xs text-[9px] font-bold bg-amber-500/20 text-amber-300">
                          Offline Friend
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-DynamicMuted mt-0.5">
                      Total Deposited: <strong className="text-DynamicSec">৳{memberDeposits.toFixed(2)}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block px-2 py-0.5 sharp-xs text-xs font-black ${
                          isRefund
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {isRefund ? `+৳${netBalance.toFixed(2)}` : `-৳${Math.abs(netBalance).toFixed(2)}`}
                      </span>
                      <p className="text-[9px] text-DynamicMuted mt-0.5">
                        {isRefund ? 'Refund due' : 'Owing'}
                      </p>
                    </div>

                    {canManageFunds && (
                      <button
                        type="button"
                        onClick={() => {
                          setDepositTargetMemberId(m.id);
                          setIsAddDepositOpen(true);
                        }}
                        className="tap-active px-1.5 py-1 surface-subtle border sharp-xs text-[10px] font-bold text-emerald-400 hover:border-emerald-500 flex items-center gap-0.5 shrink-0"
                        title="Add deposit for this participant"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Deposit</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {members.length === 0 && (
              <p className="text-xs text-center text-DynamicMuted py-4">No participants in this tour yet.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: EXPENSES */}
      {activeTab === 'expenses' && (
        <div className="surface-card space-y-2">
          <div className="flex items-center justify-between border-b pb-1.5" style={{ borderColor: 'var(--border-col)' }}>
            <div>
              <h3 className="text-xs font-bold text-DynamicMain uppercase tracking-wider">
                Tour Expenses
              </h3>
              <p className="text-[10px] text-DynamicMuted">
                Total: <strong className="text-DynamicMain">৳{totalExpenses.toFixed(2)}</strong>
              </p>
            </div>
            {canManageFunds && (
              <button
                type="button"
                onClick={() => setIsAddExpenseOpen(true)}
                className="tap-active px-2.5 py-1 theme-btn-primary sharp-xs text-xs font-semibold flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Expense</span>
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            {expenses.map((exp) => (
              <div
                key={exp.id}
                className="p-2 sharp-xs surface-subtle border border-slate-800 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-DynamicMain">
                    <span className="truncate">{exp.title || exp.description || exp.category}</span>
                    <span className="text-rose-400 font-extrabold shrink-0">
                      -৳{Number(exp.amount).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[10px] text-DynamicMuted truncate mt-0.5">
                    {exp.category} • Paid by {exp.member?.name || exp.paidBy?.name || 'Treasury Cash'} •{' '}
                    {new Date(exp.date).toLocaleDateString()}
                    {exp.notes && exp.notes !== exp.title ? ` • ${exp.notes}` : ''}
                  </p>
                </div>

                {canManageFunds && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingExpense(exp)}
                      className="tap-active px-1.5 py-0.5 surface-input sharp-xs text-[10px] font-bold text-DynamicSec hover:text-DynamicMain border flex items-center gap-1"
                      title="Edit Expense"
                    >
                      <Edit3 className="w-3 h-3 text-indigo-400" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget({
                          type: 'expense',
                          id: exp.id,
                          name: exp.title || exp.description || 'this expense',
                        })
                      }
                      className="tap-active p-1 text-DynamicMuted hover:text-rose-400 sharp-xs"
                      title="Delete Expense"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {expenses.length === 0 && (
              <div className="text-center py-6 space-y-2">
                <p className="text-xs text-DynamicMuted">No tour expenses recorded yet.</p>
                {canManageFunds && (
                  <button
                    type="button"
                    onClick={() => setIsAddExpenseOpen(true)}
                    className="tap-active px-3 py-1.5 theme-btn-primary sharp-xs text-xs font-bold inline-flex items-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Record First Expense</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DEPOSITS */}
      {activeTab === 'deposits' && (
        <div className="surface-card space-y-2">
          <div className="flex items-center justify-between border-b pb-1.5" style={{ borderColor: 'var(--border-col)' }}>
            <div>
              <h3 className="text-xs font-bold text-DynamicMain uppercase tracking-wider">
                Tour Deposits
              </h3>
              <p className="text-[10px] text-DynamicMuted">
                Total: <strong className="text-DynamicMain">৳{totalDeposits.toFixed(2)}</strong>
              </p>
            </div>
            {canManageFunds && (
              <button
                type="button"
                onClick={() => {
                  setDepositTargetMemberId(null);
                  setIsAddDepositOpen(true);
                }}
                className="tap-active px-2.5 py-1 theme-btn-primary sharp-xs text-xs font-semibold flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Deposit</span>
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            {deposits.map((dep) => (
              <div
                key={dep.id}
                className="p-2 sharp-xs surface-subtle border border-slate-800 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-DynamicMain">
                    <span className="truncate">{dep.member?.name || dep.name || 'Member'}</span>
                    <span className="text-emerald-400 font-extrabold shrink-0">
                      +৳{Number(dep.amount).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[10px] text-DynamicMuted truncate mt-0.5">
                    Deposit • {new Date(dep.date).toLocaleDateString()}
                    {dep.notes ? ` • ${dep.notes}` : ''}
                  </p>
                </div>

                {canManageFunds && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingDeposit(dep)}
                      className="tap-active px-1.5 py-0.5 surface-input sharp-xs text-[10px] font-bold text-DynamicSec hover:text-DynamicMain border flex items-center gap-1"
                      title="Edit Deposit"
                    >
                      <Edit3 className="w-3 h-3 text-emerald-400" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget({
                          type: 'deposit',
                          id: dep.id,
                          name: `Deposit of ৳${dep.amount}`,
                        })
                      }
                      className="tap-active p-1 text-DynamicMuted hover:text-rose-400 sharp-xs"
                      title="Delete Deposit"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {deposits.length === 0 && (
              <div className="text-center py-6 space-y-2">
                <p className="text-xs text-DynamicMuted">No member deposits collected yet.</p>
                {canManageFunds && (
                  <button
                    type="button"
                    onClick={() => {
                      setDepositTargetMemberId(null);
                      setIsAddDepositOpen(true);
                    }}
                    className="tap-active px-3 py-1.5 theme-btn-primary sharp-xs text-xs font-bold inline-flex items-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Record First Deposit</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PARTICIPANTS */}
      {activeTab === 'participants' && (
        <div className="surface-card space-y-2.5">
          <div className="flex items-center justify-between border-b pb-1.5" style={{ borderColor: 'var(--border-col)' }}>
            <div>
              <h3 className="text-xs font-bold text-DynamicMain uppercase tracking-wider">
                Tour Participants
              </h3>
              <p className="text-[10px] text-DynamicMuted">{members.length} Total People</p>
            </div>
            {canManageFunds && (
              <button
                type="button"
                onClick={() => setIsAddParticipantOpen(true)}
                className="tap-active px-2.5 py-1 theme-btn-primary sharp-xs text-xs font-semibold flex items-center gap-1 shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Member</span>
              </button>
            )}
          </div>

          {/* Member Search Bar */}
          {members.length > 3 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-DynamicMuted" />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search member by name, phone or email..."
                className="w-full pl-8 pr-2.5 py-1 text-xs surface-input sharp-xs"
              />
            </div>
          )}

          <div className="space-y-1.5">
            {filteredMembers.map((m) => {
              const name = m.name || m.user?.name || 'Participant';
              const canModifyRole = isLead && m.role !== 'LEAD';

              return (
                <div
                  key={m.id}
                  className="p-2 sharp-xs surface-subtle border border-slate-800 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-DynamicMain truncate">{name}</span>
                      <span className="px-1.5 py-0.2 sharp-xs text-[9px] font-bold surface-card border text-DynamicSec">
                        {m.role}
                      </span>
                      {m.userId === null && (
                        <span className="px-1.5 py-0.2 sharp-xs text-[9px] font-bold bg-amber-500/20 text-amber-300">
                          Offline Friend
                        </span>
                      )}
                    </div>
                    {(m.email || m.user?.email || m.phone || m.user?.phone) && (
                      <p className="text-[10px] text-DynamicMuted truncate mt-0.5">
                        {m.email || m.user?.email || ''}
                        {m.phone || m.user?.phone ? ` • ${m.phone || m.user?.phone}` : ''}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Role Toggles (Lead only) */}
                    {canModifyRole && (
                      <button
                        type="button"
                        onClick={() =>
                          handlePromoteRole(
                            m.id,
                            m.role === 'ACCOUNTANT' ? 'MEMBER' : 'ACCOUNTANT'
                          )
                        }
                        className="tap-active px-1.5 py-0.5 surface-input sharp-xs text-[9px] font-bold text-indigo-400 hover:border-indigo-500"
                        title="Toggle Accountant Role"
                      >
                        {m.role === 'ACCOUNTANT' ? 'Demote Member' : 'Make Accountant'}
                      </button>
                    )}

                    {isLead && m.role !== 'LEAD' && (
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget({
                            type: 'participant',
                            id: m.id,
                            name,
                          })
                        }
                        className="tap-active p-1 text-DynamicMuted hover:text-rose-400 sharp-xs"
                        title="Remove Participant"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredMembers.length === 0 && (
              <div className="text-center py-6 space-y-2">
                <Users className="w-8 h-8 mx-auto text-DynamicMuted opacity-50" />
                <p className="text-xs text-DynamicMuted">No participants matched your search.</p>
                {canManageFunds && (
                  <button
                    type="button"
                    onClick={() => setIsAddParticipantOpen(true)}
                    className="tap-active px-3 py-1.5 theme-btn-primary sharp-xs text-xs font-bold inline-flex items-center gap-1 shadow-xs"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Participant</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Modals */}
      <AddTourExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        tourId={tour.id}
        members={members}
        onSuccess={fetchTour}
      />

      <AddTourDepositModal
        isOpen={isAddDepositOpen}
        onClose={() => {
          setIsAddDepositOpen(false);
          setDepositTargetMemberId(null);
        }}
        tourId={tour.id}
        members={members}
        defaultMemberId={depositTargetMemberId}
        onSuccess={fetchTour}
      />

      <AddTourMemberModal
        isOpen={isAddParticipantOpen}
        onClose={() => setIsAddParticipantOpen(false)}
        tourId={tour.id}
        existingTourMembers={members}
        onSuccess={fetchTour}
      />

      <EditTourExpenseModal
        isOpen={Boolean(editingExpense)}
        onClose={() => setEditingExpense(null)}
        tourId={tour.id}
        expense={editingExpense}
        members={members}
        onSuccess={fetchTour}
      />

      <EditTourDepositModal
        isOpen={Boolean(editingDeposit)}
        onClose={() => setEditingDeposit(null)}
        tourId={tour.id}
        deposit={editingDeposit}
        members={members}
        onSuccess={fetchTour}
      />

      <EditTourModal
        isOpen={isEditTourOpen}
        onClose={() => setIsEditTourOpen(false)}
        tour={tour}
        onSuccess={fetchTour}
      />

      {/* Confirmation Modal for Negative Actions (Confirm on LEFT, Cancel on RIGHT) */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleExecuteDelete}
        title={
          deleteTarget?.type === 'tour'
            ? 'Delete Entire Tour'
            : deleteTarget?.type === 'participant'
            ? 'Remove Participant'
            : 'Delete Record'
        }
        message={
          deleteTarget?.type === 'tour'
            ? `Are you sure you want to delete "${deleteTarget?.name}"? All tour expenses, deposits, and settlement data will be permanently wiped.`
            : deleteTarget?.type === 'participant'
            ? `Are you sure you want to remove "${deleteTarget?.name}" from this tour?`
            : `Are you sure you want to delete ${deleteTarget?.name}? This will immediately update treasury balance and member splits.`
        }
        confirmText="Yes, Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
      />
    </div>
  );
}
