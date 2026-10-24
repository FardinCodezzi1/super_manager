import { useState, useEffect } from 'react';
import { Search, UserPlus, Check, Plus, AlertCircle, UserCheck } from 'lucide-react';
import { Modal } from '../common/Modal';
import { tourService } from '../../services/tourService';
import { useMess } from '../../context/MessContext';
import { showToast } from '../common/Toast';

export function CreateTourModal({ isOpen, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return showToast('Tour name is required', 'error');

    setSubmitting(true);
    try {
      const res = await tourService.createTour({
        name: name.trim(),
        destination: destination.trim() || undefined,
        startDate: startDate ? startDate + 'T00:00:00.000Z' : undefined,
        endDate: endDate ? endDate + 'T23:59:59.000Z' : undefined,
        budget: budget ? parseFloat(budget) : undefined,
      });
      showToast('Tour created successfully!', 'success');
      setName('');
      setDestination('');
      setBudget('');
      onClose();
      if (onSuccess) onSuccess(res?.tour || res);
    } catch (err) {
      showToast(err.message || 'Failed to create tour', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Tour Trip"
      subtitle="Set up destination, estimated budget and dates"
      maxWidth="max-w-sm"
    >
      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div>
          <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
            Tour Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cox's Bazar Trip 2026"
            className="w-full px-2 py-1.5 text-xs surface-input sharp-xs font-bold"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
            Destination
          </label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g. Cox's Bazar, Sajek"
            className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
            Estimated Budget (৳)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="e.g. 25000"
            className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="tap-active w-full py-2 theme-btn-primary sharp-xs text-xs font-bold whitespace-nowrap disabled:opacity-50"
        >
          {submitting ? 'Creating...' : 'Create Tour'}
        </button>
      </form>
    </Modal>
  );
}

export function JoinTourModal({ isOpen, onClose, onSuccess }) {
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return showToast('Please enter an invite code', 'error');

    setSubmitting(true);
    try {
      await tourService.joinTour({ inviteCode: inviteCode.trim().toUpperCase() });
      showToast('Joined tour successfully!', 'success');
      setInviteCode('');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast(err.message || 'Failed to join tour', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Join a Tour Trip"
      subtitle="Enter the invite code shared by the tour organizer"
      maxWidth="max-w-sm"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
            Tour Invite Code
          </label>
          <input
            type="text"
            required
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="e.g. TOUR-XXXXX"
            className="w-full px-2.5 py-2 text-xs surface-input sharp-xs uppercase font-mono font-bold"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="tap-active w-full py-2 theme-btn-primary sharp-xs text-xs font-bold whitespace-nowrap disabled:opacity-50"
        >
          {submitting ? 'Joining...' : 'Join Tour'}
        </button>
      </form>
    </Modal>
  );
}

export function AddTourExpenseModal({ isOpen, onClose, tourId, members = [], onSuccess }) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [description, setDescription] = useState('');
  const [paidById, setPaidById] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return showToast('Enter valid expense amount', 'error');

    setSubmitting(true);
    try {
      await tourService.addExpense(tourId, {
        title: description.trim() || category.trim() || 'Trip Expense',
        amount: numAmount,
        category: category.trim() || 'Food',
        date: date + 'T12:00:00.000Z',
        memberId: paidById || undefined,
        notes: description.trim() || undefined,
      });
      showToast('Expense recorded successfully!', 'success');
      setAmount('');
      setDescription('');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast(err.message || 'Failed to add expense', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Tour Expense"
      subtitle="Tickets, hotels, transport or dining"
      maxWidth="max-w-sm"
    >
      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
              Amount (৳)
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-2 py-1.5 text-xs surface-input sharp-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
              Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
          >
            <option value="Food">Food &amp; Dining</option>
            <option value="Hotel">Hotel &amp; Lodging</option>
            <option value="Transport">Transport &amp; Fuel</option>
            <option value="Tickets">Entry Tickets &amp; Rides</option>
            <option value="Shopping">Shopping &amp; Groceries</option>
            <option value="Emergency">Emergency / Medical</option>
            <option value="Other">Other Expenses</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Lunch at Sea Stone Cafe"
            className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
            Paid By
          </label>
          <select
            value={paidById}
            onChange={(e) => setPaidById(e.target.value)}
            className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
          >
            <option value="">Paid from Treasury Cash</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                Paid by {m.name || m.user?.name || 'Member'}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="tap-active w-full py-2 theme-btn-primary sharp-xs text-xs font-bold whitespace-nowrap disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Save Expense'}
        </button>
      </form>
    </Modal>
  );
}

export function AddTourDepositModal({ isOpen, onClose, tourId, members = [], onSuccess, defaultMemberId }) {
  const [memberId, setMemberId] = useState(defaultMemberId || '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (defaultMemberId) {
      setMemberId(defaultMemberId);
    }
  }, [defaultMemberId, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return showToast('Enter valid deposit amount', 'error');
    if (!memberId) return showToast('Select participant', 'error');

    setSubmitting(true);
    try {
      await tourService.addDeposit(tourId, {
        memberId,
        amount: numAmount,
        date: date + 'T12:00:00.000Z',
        notes: notes.trim() || undefined,
      });
      showToast('Deposit recorded into tour treasury!', 'success');
      setAmount('');
      setNotes('');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast(err.message || 'Failed to record deposit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Tour Member Deposit"
      subtitle="Funds collected from participant into tour treasury"
      maxWidth="max-w-sm"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
            Participant
          </label>
          <select
            required
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
          >
            <option value="">Select Participant</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name || m.user?.name || 'Member'} ({m.role})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
              Amount (৳)
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-2 py-1.5 text-xs surface-input sharp-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
              Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
            Notes (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Initial trip advance"
            className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="tap-active w-full py-2 theme-btn-primary sharp-xs text-xs font-bold whitespace-nowrap disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Save Deposit'}
        </button>
      </form>
    </Modal>
  );
}

export function AddTourMemberModal({ isOpen, onClose, tourId, existingTourMembers = [], onSuccess }) {
  const { members: messMembers } = useMess();

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null); // null = unsearched, array of found users
  const [hasSearched, setHasSearched] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [submitting, setSubmitting] = useState(false);

  // Filter available mess roommates who are not yet in the tour
  const availableRoommates = (messMembers || []).filter((mm) => {
    const mmEmail = mm.user?.email?.toLowerCase();
    const mmName = mm.user?.name?.toLowerCase();
    return !existingTourMembers.some((etm) => {
      const etmEmail = (etm.email || etm.user?.email || '').toLowerCase();
      const etmName = (etm.name || etm.user?.name || '').toLowerCase();
      return (mmEmail && etmEmail && mmEmail === etmEmail) || (mmName && etmName && mmName === etmName);
    });
  });

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSearchResult(null);
      setHasSearched(false);
      setName('');
      setPhone('');
      setEmail('');
      setRole('MEMBER');
    }
  }, [isOpen]);

  const handleSearch = () => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      showToast('Enter name or email to search', 'error');
      return;
    }

    setHasSearched(true);

    // Search across known system users (roommates from mess)
    const matches = (messMembers || [])
      .filter((mm) => {
        const u = mm.user || {};
        const uName = (u.name || '').toLowerCase();
        const uEmail = (u.email || '').toLowerCase();
        const uPhone = (u.phone || '').toLowerCase();
        return uName.includes(q) || uEmail.includes(q) || uPhone.includes(q);
      })
      .map((mm) => ({
        id: mm.user?.id || mm.id,
        name: mm.user?.name || 'User',
        email: mm.user?.email || '',
        phone: mm.user?.phone || '',
        isRoommate: true,
      }));

    if (matches.length > 0) {
      setSearchResult(matches);
    } else {
      setSearchResult([]);
      // Pre-fill offline friend name/email
      if (q.includes('@')) {
        setEmail(searchQuery.trim());
        setName('');
      } else {
        setName(searchQuery.trim());
        setEmail('');
      }
    }
  };

  const handleSelectFoundUser = async (foundUser) => {
    setSubmitting(true);
    try {
      await tourService.addParticipant(tourId, {
        name: foundUser.name,
        phone: foundUser.phone || undefined,
        email: foundUser.email || undefined,
        role,
      });
      showToast(`Added ${foundUser.name} to tour!`, 'success');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast(err.message || 'Failed to add participant', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectRoommate = (rm) => {
    setName(rm.user?.name || '');
    setEmail(rm.user?.email || '');
    setPhone(rm.user?.phone || '');
  };

  const handleSubmitOffline = async (e) => {
    e.preventDefault();
    if (!name.trim()) return showToast('Please enter participant name', 'error');

    setSubmitting(true);
    try {
      await tourService.addParticipant(tourId, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        role,
      });
      showToast('Participant added to tour successfully!', 'success');
      setName('');
      setPhone('');
      setEmail('');
      setRole('MEMBER');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast(err.message || 'Failed to add participant', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Tour Participant"
      subtitle="Search user in system or add as offline friend"
      maxWidth="max-w-md"
    >
      <div className="space-y-3.5">
        {/* Step 1: Search for User in System First */}
        <div className="surface-subtle p-3 sharp-xs border border-slate-700/50 space-y-2">
          <label className="block text-[11px] font-bold text-DynamicMain">
            1. Search User in System
          </label>
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHasSearched(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                placeholder="Enter user name or email..."
                className="w-full px-2.5 py-1.5 text-xs surface-input sharp-xs font-semibold"
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              className="tap-active px-3 py-1.5 theme-btn-primary sharp-xs text-xs font-bold flex items-center gap-1 shadow-xs shrink-0"
              title="Search user in system"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>
          </div>

          {/* Search Result: Found User */}
          {hasSearched && searchResult && searchResult.length > 0 && (
            <div className="pt-2 border-t border-slate-700/30 space-y-1.5">
              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>Found {searchResult.length} matching user in system:</span>
              </span>

              {searchResult.map((u) => {
                const isAlreadyIn = existingTourMembers.some(
                  (em) => (em.email && em.email === u.email) || (em.name && em.name === u.name)
                );

                return (
                  <div
                    key={u.id}
                    className="p-2 surface-card border border-emerald-500/40 sharp-xs flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <div className="w-7 h-7 theme-btn-primary sharp-xs flex items-center justify-center font-bold text-xs shrink-0">
                        {u.name[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-DynamicMain truncate">{u.name}</p>
                        <p className="text-[10px] text-DynamicMuted truncate">{u.email || u.phone}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isAlreadyIn ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold surface-subtle text-DynamicMuted sharp-xs border">
                          Already in Tour
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleSelectFoundUser(u)}
                          className="tap-active px-2.5 py-1 text-xs font-bold theme-btn-primary sharp-xs flex items-center gap-1 shadow-xs disabled:opacity-50"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Add to Tour</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Search Result: Not Found Notice */}
          {hasSearched && searchResult && searchResult.length === 0 && (
            <div className="p-2 surface-card border border-amber-500/40 sharp-xs space-y-1 text-center pt-2">
              <p className="text-xs font-bold text-amber-300 flex items-center justify-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>User not found in system</span>
              </p>
              <p className="text-[10px] text-DynamicMuted">
                No user found matching "{searchQuery}". You can add them below as an offline friend / guest participant:
              </p>
            </div>
          )}
        </div>

        {/* Quick-Add from Mess Roommates if available */}
        {availableRoommates.length > 0 && (
          <div className="surface-subtle p-2.5 sharp-xs border border-slate-700/50 space-y-1.5">
            <label className="block text-[10px] font-extrabold text-DynamicMuted uppercase tracking-wider">
              Quick-Add From Roommates
            </label>
            <div className="flex flex-wrap gap-1">
              {availableRoommates.map((rm) => (
                <button
                  key={rm.id}
                  type="button"
                  onClick={() => handleSelectRoommate(rm)}
                  className="tap-active px-2 py-1 text-[10px] font-bold surface-card border border-slate-700 text-indigo-300 hover:border-indigo-400 sharp-xs flex items-center gap-1"
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>{rm.user?.name || 'Roommate'}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Add Offline Friend Form */}
        <div className="surface-subtle p-3 sharp-xs border border-slate-700/50 space-y-2.5">
          <div>
            <h4 className="text-xs font-bold text-DynamicMain">
              2. Add as Offline Friend / Guest
            </h4>
            <p className="text-[10px] text-DynamicMuted">
              Friends without an account participate fully in equal share and expense splits.
            </p>
          </div>

          <form onSubmit={handleSubmitOffline} className="space-y-2.5">
            <div>
              <label className="block text-[10px] font-semibold text-DynamicSec mb-0.5">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tanvir Hasan"
                className="w-full px-2.5 py-1.5 text-xs surface-input sharp-xs font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-DynamicSec mb-0.5">
                  Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-DynamicSec mb-0.5">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs surface-input sharp-xs font-bold"
                >
                  <option value="MEMBER">Member</option>
                  <option value="ACCOUNTANT">Accountant (Manage Funds)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-DynamicSec mb-0.5">
                Email (Optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tanvir@example.com"
                className="w-full px-2.5 py-1.5 text-xs surface-input sharp-xs"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="tap-active w-full py-2 theme-btn-primary sharp-xs text-xs font-bold flex items-center justify-center gap-1 shadow-xs disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{submitting ? 'Adding...' : 'Add Offline Friend'}</span>
            </button>
          </form>
        </div>
      </div>
    </Modal>
  );
}

export const AddOfflineParticipantModal = AddTourMemberModal;

export function EditTourExpenseModal({ isOpen, onClose, tourId, expense, members = [], onSuccess }) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [title, setTitle] = useState('');
  const [paidById, setPaidById] = useState('');
  const [date, setDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (expense) {
      setAmount(String(expense.amount ?? ''));
      setCategory(expense.category || 'Food');
      setTitle(expense.title || expense.description || '');
      setPaidById(expense.memberId || expense.member?.id || '');
      setDate(expense.date ? expense.date.split('T')[0] : '');
    }
  }, [expense, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return showToast('Enter valid expense amount', 'error');

    setSubmitting(true);
    try {
      await tourService.updateExpense(tourId, expense.id, {
        title: title.trim() || category.trim() || 'Trip Expense',
        amount: numAmount,
        category: category.trim() || 'Food',
        date: date ? date + 'T12:00:00.000Z' : undefined,
        memberId: paidById || undefined,
        notes: title.trim() || undefined,
      });
      showToast('Expense updated successfully!', 'success');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast(err.message || 'Failed to update expense', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!expense) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Tour Expense"
      subtitle="Update amount, category, or paid by details"
      maxWidth="max-w-sm"
    >
      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
              Amount (৳)
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-2 py-1.5 text-xs surface-input sharp-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
              Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
          >
            <option value="Food">Food &amp; Dining</option>
            <option value="Hotel">Hotel &amp; Lodging</option>
            <option value="Transport">Transport &amp; Fuel</option>
            <option value="Tickets">Entry Tickets &amp; Rides</option>
            <option value="Shopping">Shopping &amp; Groceries</option>
            <option value="Emergency">Emergency / Medical</option>
            <option value="Other">Other Expenses</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
            Description / Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Lunch at Sea Stone Cafe"
            className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
            Paid By
          </label>
          <select
            value={paidById}
            onChange={(e) => setPaidById(e.target.value)}
            className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
          >
            <option value="">Paid from Treasury Cash</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                Paid by {m.name || m.user?.name || 'Member'}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="tap-active w-full py-2 theme-btn-primary sharp-xs text-xs font-bold whitespace-nowrap disabled:opacity-50"
        >
          {submitting ? 'Saving Changes...' : 'Update Expense'}
        </button>
      </form>
    </Modal>
  );
}

export function EditTourDepositModal({ isOpen, onClose, tourId, deposit, members = [], onSuccess }) {
  const [memberId, setMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (deposit) {
      setMemberId(deposit.memberId || deposit.member?.id || '');
      setAmount(String(deposit.amount ?? ''));
      setDate(deposit.date ? deposit.date.split('T')[0] : '');
      setNotes(deposit.notes || '');
    }
  }, [deposit, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return showToast('Enter valid deposit amount', 'error');
    if (!memberId) return showToast('Select participant', 'error');

    setSubmitting(true);
    try {
      await tourService.updateDeposit(tourId, deposit.id, {
        memberId,
        amount: numAmount,
        date: date ? date + 'T12:00:00.000Z' : undefined,
        notes: notes.trim() || undefined,
      });
      showToast('Deposit record updated successfully!', 'success');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast(err.message || 'Failed to update deposit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!deposit) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Tour Deposit"
      subtitle="Update deposit amount, participant, or date"
      maxWidth="max-w-sm"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
            Participant
          </label>
          <select
            required
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
          >
            <option value="">Select Participant</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name || m.user?.name || 'Member'} ({m.role})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
              Amount (৳)
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-2 py-1.5 text-xs surface-input sharp-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
              Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
            Notes (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Adjusted advance payment"
            className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="tap-active w-full py-2 theme-btn-primary sharp-xs text-xs font-bold whitespace-nowrap disabled:opacity-50"
        >
          {submitting ? 'Saving Changes...' : 'Update Deposit'}
        </button>
      </form>
    </Modal>
  );
}

export function EditTourModal({ isOpen, onClose, tour, onSuccess }) {
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [status, setStatus] = useState('PLANNING');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (tour) {
      setName(tour.name || '');
      setDestination(tour.destination || '');
      setStartDate(tour.startDate ? tour.startDate.split('T')[0] : '');
      setEndDate(tour.endDate ? tour.endDate.split('T')[0] : '');
      setBudget(tour.budget !== undefined && tour.budget !== null ? String(tour.budget) : '');
      setStatus(tour.status || 'PLANNING');
    }
  }, [tour, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return showToast('Tour name is required', 'error');

    setSubmitting(true);
    try {
      await tourService.updateTour(tour.id, {
        name: name.trim(),
        destination: destination.trim() || undefined,
        startDate: startDate ? startDate + 'T00:00:00.000Z' : undefined,
        endDate: endDate ? endDate + 'T23:59:59.000Z' : undefined,
        budget: budget ? parseFloat(budget) : undefined,
        status,
      });

      showToast('Tour updated successfully!', 'success');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast(err.message || 'Failed to update tour', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!tour) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Tour Trip"
      subtitle="Update trip details, budget, or status"
      maxWidth="max-w-sm"
    >
      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div>
          <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
            Tour Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-2 py-1.5 text-xs surface-input sharp-xs font-bold"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
            Destination
          </label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2 py-1.5 text-xs surface-input sharp-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
              Budget (৳)
            </label>
            <input
              type="number"
              step="0.01"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full px-2 py-1.5 text-xs surface-input sharp-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-2 py-1.5 text-xs surface-input sharp-xs font-bold"
            >
              <option value="PLANNING">Planning</option>
              <option value="ACTIVE">Active Trip</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="tap-active w-full py-2 theme-btn-primary sharp-xs text-xs font-bold whitespace-nowrap disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Update Tour'}
        </button>
      </form>
    </Modal>
  );
}
