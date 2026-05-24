import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useHome } from '../context/HomeContext';
import { useAuth } from '../context/AuthContext';
import type { Loan } from '../types';

const loanTypes = [
  { key: 'All', emoji: '🗂️', label: 'All' },
  { key: 'Home', emoji: '🏠', label: 'Home' },
  { key: 'Personal', emoji: '💳', label: 'Personal' },
  { key: 'Car', emoji: '🚗', label: 'Car' },
  { key: 'Education', emoji: '🎓', label: 'Education' },
  { key: 'Gold', emoji: '🪙', label: 'Gold' },
  { key: 'Business', emoji: '💼', label: 'Business' },
  { key: 'InterestOnly', emoji: '🔄', label: 'Interest Only' },
  { key: 'Archived', emoji: '🗄️', label: 'Archived' },
];

const formLoanTypes = loanTypes.filter(t => !['All', 'InterestOnly', 'Archived'].includes(t.key));

interface IOTransaction {
  id: string;
  date: string;
  amount: number;
  type: 'interest' | 'principal';
}

function getIOStats(loan: Loan) {
  const monthlyInt = loan.principalAmount * loan.interestRate / 12 / 100;
  let txs: IOTransaction[] = [];
  if (loan.prepayments) {
    try { txs = JSON.parse(loan.prepayments); } catch { /* ignore */ }
  }
  const intPaid = txs.filter(t => t.type === 'interest').reduce((s, t) => s + t.amount, 0);
  const prinPaid = txs.filter(t => t.type === 'principal').reduce((s, t) => s + t.amount, 0);
  const currentPrincipal = Math.max(0, loan.principalAmount - prinPaid);

  // Calculate accrued interest month-by-month
  const start = new Date(loan.startDate + 'T00:00:00');
  const now = new Date();
  const months = Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth());
  const principalTxs = txs.filter(t => t.type === 'principal').sort((a, b) => a.date.localeCompare(b.date));
  let totalAccrued = 0;
  let remPrin = loan.principalAmount;
  for (let m = 0; m < months; m++) {
    const md = new Date(start);
    md.setMonth(md.getMonth() + m);
    const mStr = `${md.getFullYear()}-${String(md.getMonth() + 1).padStart(2, '0')}`;
    for (const tx of principalTxs) {
      if (tx.date.startsWith(mStr)) remPrin = Math.max(0, remPrin - tx.amount);
    }
    totalAccrued += remPrin * loan.interestRate / 12 / 100;
  }
  const accruedInterest = Math.max(0, totalAccrued - intPaid);
  const outstanding = currentPrincipal + accruedInterest;
  const repaidPct = loan.principalAmount > 0 ? (prinPaid / loan.principalAmount * 100) : 0;

  return { monthlyInt, intPaid, prinPaid, currentPrincipal, accruedInterest, outstanding, totalInterest: totalAccrued, repaidPct };
}

function padDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const getLoanTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    'Home': 'bg-blue-50 ring-blue-100',
    'Personal': 'bg-violet-50 ring-violet-100',
    'Car': 'bg-cyan-50 ring-cyan-100',
    'Education': 'bg-indigo-50 ring-indigo-100',
    'Gold': 'bg-amber-50 ring-amber-100',
    'Business': 'bg-emerald-50 ring-emerald-100',
  };
  return colors[type] || 'bg-gray-50 ring-gray-100';
};

const getLoanTypeEmoji = (type: string) => {
  return loanTypes.find((t) => t.key === type)?.emoji || '🏦';
};

const statusStyles: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  CLOSED: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
  DEFAULTED: 'bg-red-50 text-red-600 ring-1 ring-red-200',
};

export default function Loans() {
  const { homeId } = useParams<{ homeId: string }>();
  const navigate = useNavigate();
  const { currencySymbol } = useHome();
  useAuth();

  const [loans, setLoans] = useState<Loan[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showLoanPicker, setShowLoanPicker] = useState(false);
  const [loanMode, setLoanMode] = useState<'normal' | 'interest-only'>('normal');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState('All');
  const [search, setSearch] = useState('');
  const [, setMembers] = useState<{ id: string; name: string; picture?: string }[]>([]);
  const [form, setForm] = useState({
    lender: '',
    type: 'Home',
    principalAmount: '',
    interestRate: '',
    emiAmount: '',
    startDate: padDate(new Date()),
    endDate: '',
    outstandingBalance: '',
    status: 'ACTIVE' as 'ACTIVE' | 'CLOSED' | 'DEFAULTED',
  });

  const loadLoans = () => {
    api.get('/loans').then((res) => setLoans(res.data)).catch(() => {});
  };

  useEffect(() => {
    loadLoans();
    if (homeId) {
      api.get(`/homes/${homeId}/members`).then((res) => {
        const m = res.data.map((member: { user?: { id: string; name: string; picture?: string } }) => ({
          id: member.user?.id || '',
          name: member.user?.name || 'Unknown',
          picture: member.user?.picture,
        }));
        setMembers(m);
      }).catch(() => {});
    }
  }, [homeId]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showForm || showLoanPicker) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showForm, showLoanPicker]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        principalAmount: parseFloat(form.principalAmount),
        interestRate: parseFloat(form.interestRate),
        emiAmount: loanMode === 'interest-only' ? 0 : parseFloat(form.emiAmount),
        outstandingBalance: parseFloat(form.outstandingBalance || form.principalAmount),
        endDate: loanMode === 'interest-only' ? form.startDate : form.endDate,
      };
      if (editingId) {
        await api.put(`/loans/${editingId}`, payload);
      } else {
        await api.post('/loans', payload);
      }
      handleCloseForm();
      loadLoans();
    } catch (err) {
      console.error('Loan save failed:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/loans/${id}`);
      loadLoans();
    } catch { /* ignore */ }
  };

  const handleCloseForm = () => {
    setForm({
      lender: '',
      type: 'Home',
      principalAmount: '',
      interestRate: '',
      emiAmount: '',
      startDate: padDate(new Date()),
      endDate: '',
      outstandingBalance: '',
      status: 'ACTIVE',
    });
    setEditingId(null);
    setLoanMode('normal');
    setShowForm(false);
  };

  const filtered = useMemo(() => {
    return loans.filter((l) => {
      if (activeType === 'Archived') {
        if (l.status === 'ACTIVE') return false;
      } else if (activeType === 'InterestOnly') {
        if (l.emiAmount !== 0 || l.status !== 'ACTIVE') return false;
      } else if (activeType !== 'All') {
        if (l.type !== activeType || l.status !== 'ACTIVE') return false;
      } else {
        if (l.status !== 'ACTIVE') return false;
      }
      if (search) {
        const q = search.toLowerCase();
        if (!l.lender.toLowerCase().includes(q) && !l.type.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [loans, activeType, search]);

  function getMonthsBetween(start: string, end: string) {
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    return Math.max(1, (e.getFullYear() - s.getFullYear()) * 12 + e.getMonth() - s.getMonth());
  }

  const activeLoans = loans.filter(l => l.status === 'ACTIVE');
  const totalPrincipal = activeLoans.reduce((s, l) => s + l.principalAmount, 0);

  // Separate normal and IO loans for stat calculations
  const normalActive = activeLoans.filter(l => l.emiAmount > 0);
  const ioActive = activeLoans.filter(l => l.emiAmount === 0);
  const ioStatsMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getIOStats>>();
    ioActive.forEach(l => map.set(l.id, getIOStats(l)));
    return map;
  }, [loans]);

  const monthlyOutflow = normalActive.reduce((s, l) => s + l.emiAmount, 0)
    + ioActive.reduce((s, l) => s + (ioStatsMap.get(l.id)?.monthlyInt || 0), 0);
  const remainingDebt = normalActive.reduce((s, l) => s + l.outstandingBalance, 0)
    + ioActive.reduce((s, l) => s + (ioStatsMap.get(l.id)?.outstanding || 0), 0);
  const totalInterest = useMemo(() => {
    const normalInt = normalActive.reduce((s, l) => s + Math.max(0, l.emiAmount * getMonthsBetween(l.startDate, l.endDate) - l.principalAmount), 0);
    const ioInt = ioActive.reduce((s, l) => s + (ioStatsMap.get(l.id)?.totalInterest || 0), 0);
    return normalInt + ioInt;
  }, [loans]);
  const debtCleared = totalPrincipal > 0 ? ((totalPrincipal - remainingDebt) / totalPrincipal * 100) : 0;

  const formatCurrency = (val: number) => {
    if (val >= 10000000) return `${(val / 10000000).toFixed(2)}Cr`;
    if (val >= 100000) return `${(val / 100000).toFixed(2)}L`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toLocaleString();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-gray-600 transition-colors" title="Back to Home">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Loan Manager</h1>
          </div>
          <p className="text-[13px] text-gray-500 mt-0.5 ml-6">Track EMIs and manage household loans</p>
        </div>
        <button
          onClick={() => setShowLoanPicker(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-[13px] font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Loan
          <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 mt-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21" /></svg>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{activeLoans.length}</p>
            <p className="text-[11px] font-medium text-gray-400">Active Loans</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{currencySymbol}{formatCurrency(monthlyOutflow)}</p>
            <p className="text-[11px] font-medium text-gray-400">Monthly Outflow</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{currencySymbol}{formatCurrency(remainingDebt)}</p>
            <p className="text-[11px] font-medium text-gray-400">Remaining Debt</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{currencySymbol}{formatCurrency(totalInterest)}</p>
            <p className="text-[11px] font-medium text-gray-400">Total Interest</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14.25l3-3m0 0l3 3m-3-3v8.25M3.75 3.75h16.5" /></svg>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{debtCleared.toFixed(1)}%</p>
            <p className="text-[11px] font-medium text-gray-400">Debt Cleared</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{currencySymbol}{formatCurrency(totalPrincipal)}</p>
            <p className="text-[11px] font-medium text-gray-400">Total Principal</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs + Search */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {loanTypes.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveType(t.key)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-colors shrink-0 ${
              activeType === t.key
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
        <div className="relative shrink-0 ml-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search loans..."
            className="w-40 sm:w-48 pl-9 pr-3 py-1.5 border border-gray-200 rounded-full text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
        </div>
      </div>

      {/* Loan List */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((loan) => {
            const isIO = loan.emiAmount === 0;
            if (isIO) {
              const io = ioStatsMap.get(loan.id) || getIOStats(loan);
              return (
                <div
                  key={loan.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/homes/${homeId}/loans/io/${loan.id}`)}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-xl ring-1 flex items-center justify-center shrink-0 ${getLoanTypeColor(loan.type)}`}>
                        <span className="text-[18px]">{getLoanTypeEmoji(loan.type)}</span>
                      </div>
                      <div>
                        <h3 className="text-[14px] font-semibold text-gray-900">{loan.lender}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-medium text-amber-600">{loan.type}</span>
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium text-amber-700 bg-amber-50 ring-1 ring-amber-200">Interest Only</span>
                        </div>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-x-4 gap-y-2.5 mt-3">
                    <div>
                      <p className="text-[10px] text-gray-400 font-medium">Monthly Int.</p>
                      <p className="text-[13px] font-bold text-amber-600">{currencySymbol}{Math.round(io.monthlyInt).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-medium">Outstanding</p>
                      <p className="text-[13px] font-bold text-red-600">{currencySymbol}{Math.round(io.outstanding).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-medium">Rate</p>
                      <p className="text-[13px] font-bold text-indigo-600">{loan.interestRate}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-medium">Principal</p>
                      <p className="text-[13px] font-bold text-gray-900">{currencySymbol}{loan.principalAmount.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-medium">Total Int.</p>
                      <p className="text-[13px] font-bold text-red-600">{currencySymbol}{Math.round(io.totalInterest).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-medium">Accrued Int.</p>
                      <p className="text-[13px] font-bold text-red-600">{currencySymbol}{Math.round(io.accruedInterest).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  {/* Progress */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                      <span>Principal Repaid</span>
                      <span>{io.repaidPct.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${Math.min(100, io.repaidPct)}%` }} />
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex justify-end gap-1 mt-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/homes/${homeId}/loans/io/${loan.id}`)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
                    </button>
                    <button
                      onClick={() => handleDelete(loan.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    </button>
                  </div>
                </div>
              );
            }

            // Normal EMI loan card
            const progress = loan.principalAmount > 0 ? ((loan.principalAmount - loan.outstandingBalance) / loan.principalAmount * 100) : 0;
            const months = getMonthsBetween(loan.startDate, loan.endDate);
            const startD = new Date(loan.startDate + 'T00:00:00');
            const now = new Date();
            const elapsed = Math.max(0, (now.getFullYear() - startD.getFullYear()) * 12 + now.getMonth() - startD.getMonth());
            const remaining = Math.max(0, months - elapsed);
            const totalPaid = loan.emiAmount * months;
            const loanTotalInterest = Math.max(0, totalPaid - loan.principalAmount);
            const remainingYears = Math.round(remaining / 12 * 10) / 10;
            const endDateLabel = (() => {
              const d = new Date(loan.endDate + 'T00:00:00');
              return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
            })();
            return (
              <div
                key={loan.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/homes/${homeId}/loans/${loan.id}`)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-xl ring-1 flex items-center justify-center shrink-0 ${getLoanTypeColor(loan.type)}`}>
                      <span className="text-[18px]">{getLoanTypeEmoji(loan.type)}</span>
                    </div>
                    <div>
                      <h3 className="text-[14px] font-semibold text-gray-900">{loan.lender}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusStyles[loan.status]}`}>{loan.type} Loan</span>
                      </div>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-x-4 gap-y-2.5 mt-3">
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">EMI</p>
                    <p className="text-[13px] font-bold text-indigo-600">{currencySymbol}{loan.emiAmount.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">Outstanding</p>
                    <p className="text-[13px] font-bold text-red-600">{currencySymbol}{loan.outstandingBalance.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">Rate</p>
                    <p className="text-[13px] font-bold text-emerald-600">{loan.interestRate}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">Principal</p>
                    <p className="text-[13px] font-bold text-gray-900">{currencySymbol}{loan.principalAmount.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">Interest</p>
                    <p className="text-[13px] font-bold text-red-600">{currencySymbol}{formatCurrency(Math.round(loanTotalInterest))}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium">Remaining</p>
                    <p className="text-[13px] font-bold text-emerald-600">{remainingYears > 0 ? `${remainingYears} Yr` : 'Done'}</p>
                  </div>
                </div>
                {/* End Date */}
                <div className="mt-3 pt-3 border-t border-gray-100 text-center">
                  <p className="text-[10px] text-gray-400 font-medium">End Date</p>
                  <p className="text-[14px] font-bold text-gray-900">{endDateLabel}</p>
                </div>
                {/* Progress */}
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                    <span>Progress</span>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${loan.status === 'CLOSED' ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                  </div>
                </div>
                {/* Actions */}
                <div className="flex justify-end gap-1 mt-3" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => navigate(`/homes/${homeId}/loans/${loan.id}`)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
                  </button>
                  <button
                    onClick={() => handleDelete(loan.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">No loans added yet</p>
          <p className="text-xs text-gray-400 mt-1">Add your first loan to start tracking EMIs</p>
          <button
            onClick={() => setShowLoanPicker(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-[13px] font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add First Loan
          </button>
        </div>
      )}

      {/* Loan Type Picker Modal */}
      {showLoanPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowLoanPicker(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[15px] font-semibold text-gray-900">Choose Loan Type</h2>
              <button type="button" onClick={() => setShowLoanPicker(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <button
              type="button"
              onClick={() => { setShowLoanPicker(false); navigate(`/homes/${homeId}/loans/new`); }}
              className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 ring-1 ring-indigo-100 flex items-center justify-center shrink-0">
                  <span className="text-[20px]">🏦</span>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-gray-900 group-hover:text-indigo-700">Normal Loan</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">EMI-based (Home, Car, etc.)</p>
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => { setShowLoanPicker(false); navigate(`/homes/${homeId}/loans/io/new`); }}
              className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-amber-300 hover:bg-amber-50/40 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 ring-1 ring-amber-100 flex items-center justify-center shrink-0">
                  <span className="text-[20px]">🪙</span>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-gray-900 group-hover:text-amber-700">Interest-Only Loan</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Gold loan, secured loan, etc.</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Loan Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-start justify-center sm:pt-10 sm:pb-10 sm:px-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCloseForm} />
          <form
            onSubmit={handleSubmit}
            className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] sm:max-h-[calc(100vh-5rem)] overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-gray-900">
                {editingId ? 'Edit Loan' : loanMode === 'interest-only' ? 'Add Interest-Only Loan' : 'Add Loan'}
              </h2>
              <button type="button" onClick={handleCloseForm} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Lender */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Lender / Bank</label>
              <input
                type="text"
                required
                placeholder="e.g. HDFC Bank, SBI, LIC"
                value={form.lender}
                onChange={(e) => setForm({ ...form, lender: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Loan Type pills */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Loan Type</label>
              <div className="flex flex-wrap gap-1.5">
                {formLoanTypes.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setForm({ ...form, type: t.key })}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                      form.type === t.key
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span>{t.emoji}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Principal & Interest Rate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Principal ({currencySymbol})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={form.principalAmount}
                  onChange={(e) => setForm({ ...form, principalAmount: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Interest Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={form.interestRate}
                  onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* EMI & Outstanding */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {loanMode === 'normal' && (
                <div>
                  <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">EMI Amount ({currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={form.emiAmount}
                    onChange={(e) => setForm({ ...form, emiAmount: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              )}
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Outstanding ({currencySymbol})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={form.principalAmount || '0.00'}
                  value={form.outstandingBalance}
                  onChange={(e) => setForm({ ...form, outstandingBalance: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Start / End Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Start Date</label>
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              {loanMode === 'normal' && (
                <div>
                  <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">End Date</label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
              <div className="flex flex-wrap gap-1.5">
                {(['ACTIVE', 'CLOSED', 'DEFAULTED'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, status: s })}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                      form.status === s
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-2">
                {editingId && (
                  <button
                    type="button"
                    onClick={() => { handleDelete(editingId); handleCloseForm(); }}
                    className="px-4 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white text-[13px] font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {editingId ? 'Save' : 'Add Loan'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
