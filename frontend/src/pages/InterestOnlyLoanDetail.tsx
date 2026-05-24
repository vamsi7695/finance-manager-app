import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useHome } from '../context/HomeContext';
import type { Loan } from '../types';

interface LoanTransaction {
  id: string;
  date: string;
  amount: number;
  type: 'interest' | 'principal' | 'rate_change';
  note?: string;
}

const loanTypes = [
  { key: 'Gold', emoji: '🪙', label: 'Gold Loan' },
  { key: 'Personal', emoji: '💳', label: 'Personal' },
  { key: 'Business', emoji: '💼', label: 'Business' },
  { key: 'Home', emoji: '🏠', label: 'Home' },
  { key: 'Car', emoji: '🚗', label: 'Car' },
  { key: 'Education', emoji: '🎓', label: 'Education' },
];

function padDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatINR(val: number) {
  if (val >= 10000000) return `${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `${(val / 100000).toFixed(2)}L`;
  return val.toLocaleString('en-IN');
}

export default function InterestOnlyLoanDetail() {
  const { homeId, loanId } = useParams<{ homeId: string; loanId: string }>();
  const navigate = useNavigate();
  const { currencySymbol } = useHome();
  const isNew = loanId === 'new';

  const [type, setType] = useState('Gold');
  const [lender, setLender] = useState('');
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [startDate, setStartDate] = useState(padDate(new Date()));
  const [transactions, setTransactions] = useState<LoanTransaction[]>([]);

  const [showTxForm, setShowTxForm] = useState(false);
  const [txDate, setTxDate] = useState(padDate(new Date()));
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState<'interest' | 'principal' | 'rate_change'>('interest');
  const [txNote, setTxNote] = useState('');

  const [analysisTab, setAnalysisTab] = useState<'analysis' | 'schedule'>('analysis');
  const [saving, setSaving] = useState(false);

  const loanIdNum = isNew ? undefined : loanId;
  // Load existing loan
  useEffect(() => {
    if (!isNew && loanIdNum) {
      api.get('/loans').then((res) => {
        const found = res.data.find((l: Loan) => String(l.id) === String(loanIdNum));
        if (found) {
          setType(found.type);
          setLender(found.lender);
          setPrincipal(String(found.principalAmount));
          setRate(String(found.interestRate));
          setStartDate(found.startDate);
          if (found.prepayments) {
            try { setTransactions(JSON.parse(found.prepayments)); } catch { /* ignore */ }
          }
        }
      });
    }
  }, [loanId]);

  // Body scroll lock
  useEffect(() => {
    if (showTxForm) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [showTxForm]);

  const principalNum = parseFloat(principal) || 0;
  const rateNum = parseFloat(rate) || 0;
  const totalInterestPaid = transactions.filter(t => t.type === 'interest').reduce((s, t) => s + t.amount, 0);
  const principalPaid = transactions.filter(t => t.type === 'principal').reduce((s, t) => s + t.amount, 0);
  const currentPrincipal = Math.max(0, principalNum - principalPaid);
  const currentMonthlyInterest = currentPrincipal * rateNum / 12 / 100;
  const dailyInterest = currentMonthlyInterest / 30;

  // Accrued interest (month-by-month, adjusting for principal changes)
  const accruedInterest = useMemo(() => {
    if (!startDate || principalNum <= 0 || rateNum <= 0) return 0;
    const start = new Date(startDate + 'T00:00:00');
    const now = new Date();
    if (now < start) return 0;
    const months = Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth());

    const principalTxs = transactions
      .filter(t => t.type === 'principal')
      .sort((a, b) => a.date.localeCompare(b.date));

    let totalAccrued = 0;
    let remPrincipal = principalNum;

    for (let m = 0; m < months; m++) {
      const md = new Date(start.getFullYear(), start.getMonth() + m, 1);
      const mStr = `${md.getFullYear()}-${String(md.getMonth() + 1).padStart(2, '0')}`;
      for (const tx of principalTxs) {
        if (tx.date.startsWith(mStr)) remPrincipal = Math.max(0, remPrincipal - tx.amount);
      }
      totalAccrued += remPrincipal * rateNum / 12 / 100;
    }
    return Math.max(0, totalAccrued - totalInterestPaid);
  }, [startDate, principalNum, rateNum, transactions, totalInterestPaid]);

  const outstanding = currentPrincipal + accruedInterest;

  // Schedule
  const schedule = useMemo(() => {
    if (!startDate || principalNum <= 0 || rateNum <= 0) return [];
    const start = new Date(startDate + 'T00:00:00');
    const now = new Date();
    if (now < start) return [];
    const months = Math.min(120, Math.max(1, (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth() + 1));

    const rows: { month: number; date: string; interest: number; intPaid: number; prinPaid: number; accrued: number; balance: number }[] = [];
    let rem = principalNum;
    let runAccrued = 0;

    for (let m = 0; m < months && rem > 0; m++) {
      const md = new Date(start.getFullYear(), start.getMonth() + m, 1);
      const mStr = `${md.getFullYear()}-${String(md.getMonth() + 1).padStart(2, '0')}`;
      const dateLabel = md.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

      const interest = rem * rateNum / 12 / 100;
      runAccrued += interest;

      const mTxs = transactions.filter(t => t.date.startsWith(mStr));
      const ip = mTxs.filter(t => t.type === 'interest').reduce((s, t) => s + t.amount, 0);
      const pp = mTxs.filter(t => t.type === 'principal').reduce((s, t) => s + t.amount, 0);

      runAccrued = Math.max(0, runAccrued - ip);
      rem = Math.max(0, rem - pp);

      rows.push({ month: m + 1, date: dateLabel, interest, intPaid: ip, prinPaid: pp, accrued: runAccrued, balance: rem });
    }
    return rows;
  }, [startDate, principalNum, rateNum, transactions]);

  const handleSave = async (goBack = true) => {
    if (!principal || !rate || !lender) return;
    setSaving(true);
    try {
      const payload = {
        lender,
        type,
        principalAmount: principalNum,
        interestRate: rateNum,
        emiAmount: 0,
        startDate,
        endDate: startDate,
        outstandingBalance: currentPrincipal,
        tenureMonths: 0,
        prepayments: transactions.length > 0 ? JSON.stringify(transactions) : null,
        status: currentPrincipal <= 0 && accruedInterest <= 0 ? 'CLOSED' : 'ACTIVE',
      };
      if (isNew) await api.post('/loans', payload);
      else await api.put(`/loans/${loanId}`, payload);
      if (goBack) navigate(`/homes/${homeId}/loans`);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!loanId || isNew) return;
    try {
      await api.delete(`/loans/${loanId}`);
      navigate(`/homes/${homeId}/loans`);
    } catch { /* ignore */ }
  };

  const persistLoan = async (txs: LoanTransaction[], opts?: { newRate?: number }) => {
    if (isNew || !loanId) return;
    const pNum = parseFloat(principal) || 0;
    const rNum = opts?.newRate ?? (parseFloat(rate) || 0);
    const pPaid = txs.filter(t => t.type === 'principal').reduce((s, t) => s + t.amount, 0);
    const curPrincipal = Math.max(0, pNum - pPaid);
    const intPaid = txs.filter(t => t.type === 'interest').reduce((s, t) => s + t.amount, 0);
    // Simple accrued calc for status check
    const start = new Date(startDate + 'T00:00:00');
    const now = new Date();
    const months = Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth());
    let tmpAccrued = 0;
    let tmpRem = pNum;
    const pTxs = txs.filter(t => t.type === 'principal').sort((a, b) => a.date.localeCompare(b.date));
    for (let m = 0; m < months; m++) {
      const md = new Date(start.getFullYear(), start.getMonth() + m, 1);
      const mStr = `${md.getFullYear()}-${String(md.getMonth() + 1).padStart(2, '0')}`;
      for (const tx of pTxs) { if (tx.date.startsWith(mStr)) tmpRem = Math.max(0, tmpRem - tx.amount); }
      tmpAccrued += tmpRem * rNum / 12 / 100;
    }
    tmpAccrued = Math.max(0, tmpAccrued - intPaid);
    try {
      await api.put(`/loans/${loanId}`, {
        lender, type,
        principalAmount: pNum,
        interestRate: rNum,
        emiAmount: 0,
        startDate, endDate: startDate,
        outstandingBalance: curPrincipal,
        tenureMonths: 0,
        prepayments: txs.length > 0 ? JSON.stringify(txs) : null,
        status: curPrincipal <= 0 && tmpAccrued <= 0 ? 'CLOSED' : 'ACTIVE',
      });
    } catch (err) { console.error('Auto-save failed:', err); }
  };

  const addTransaction = () => {
    if (!txAmount) return;
    let newTxs: LoanTransaction[];
    if (txType === 'rate_change') {
      setRate(txAmount);
      newTxs = [...transactions, {
        id: Date.now().toString(),
        date: txDate,
        amount: parseFloat(txAmount),
        type: 'rate_change',
        note: txNote || `Rate changed to ${txAmount}%`,
      }];
      setTransactions(newTxs);
      persistLoan(newTxs, { newRate: parseFloat(txAmount) });
    } else {
      newTxs = [...transactions, {
        id: Date.now().toString(),
        date: txDate,
        amount: parseFloat(txAmount),
        type: txType,
        note: txNote || undefined,
      }];
      setTransactions(newTxs);
      persistLoan(newTxs);
    }
    setTxAmount('');
    setTxNote('');
    setShowTxForm(false);
  };

  const removeTransaction = (id: string) => {
    const newTxs = transactions.filter(t => t.id !== id);
    setTransactions(newTxs);
    persistLoan(newTxs);
  };

  const sortedTxs = [...transactions].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      {/* Back Link */}
      <button
        onClick={() => navigate(`/homes/${homeId}/loans`)}
        className="inline-flex items-center gap-1 text-[13px] text-gray-500 hover:text-gray-700 mb-3 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to Loans
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Interest-Only Loan</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">No EMI • Interest compounds monthly</p>
        </div>
        <div className="flex items-center gap-1.5">
          {!isNew && (
            <button onClick={handleDelete} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
            </button>
          )}
          <button onClick={() => handleSave(false)} disabled={saving || !principal || !rate || !lender} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-gray-500 hover:text-amber-700 hover:bg-amber-50 border border-gray-200 transition-colors disabled:opacity-40" title="Save">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
            Save
          </button>
          <button onClick={() => handleSave(true)} disabled={saving || !principal || !rate || !lender} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-white bg-amber-500 hover:bg-amber-600 transition-colors disabled:opacity-40" title="Save & Close">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.5 12.75l6 6 9-13.5" /></svg>
            Save & Close
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
        {/* Left: Form + Transactions */}
        <div className="lg:col-span-2 space-y-5">
          {/* Loan Details Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 space-y-4 border-l-4 border-l-amber-400">
            <h2 className="text-[15px] font-bold text-gray-900">Loan Details</h2>

            <div>
              <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Lender / Bank</label>
              <input
                type="text"
                required
                placeholder="e.g. Muthoot, SBI"
                value={lender}
                onChange={(e) => setLender(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-gray-500 mb-1.5">Loan Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M2%204l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-8"
              >
                {loanTypes.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Loan Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-gray-400">{currencySymbol}</span>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="100000"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Interest Rate (Annual)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="12"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 pr-8 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-gray-400">%</span>
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Start Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Monthly Interest Display */}
            {principalNum > 0 && rateNum > 0 && (
              <div className="bg-amber-50 rounded-lg p-3.5 border border-amber-100">
                <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Monthly Interest</p>
                <p className="text-xl font-bold text-amber-700 mt-0.5">
                  {currencySymbol}{formatINR(Math.round(currentMonthlyInterest))}
                </p>
                <p className="text-[11px] text-amber-500 mt-0.5">
                  at {rateNum}% p.a. • Daily: {currencySymbol}{Math.round(dailyInterest).toLocaleString('en-IN')}
                </p>
              </div>
            )}
          </div>

          {/* Transactions Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 space-y-3 border-l-4 border-l-emerald-400">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-gray-900">Transactions</h2>
              <button
                type="button"
                onClick={() => { setTxDate(padDate(new Date())); setShowTxForm(true); }}
                className="text-[12px] font-medium text-amber-600 hover:text-amber-700"
              >
                + Add
              </button>
            </div>
            {sortedTxs.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-[12px] text-gray-400">No transactions recorded.</p>
                <button
                  type="button"
                  onClick={() => { setTxDate(padDate(new Date())); setShowTxForm(true); }}
                  className="mt-2 text-[12px] font-medium text-amber-600 hover:text-amber-700"
                >
                  Add Transaction
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                {sortedTxs.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        tx.type === 'interest' ? 'bg-amber-50' : 'bg-emerald-50'
                      }`}>
                        <span className="text-[14px]">{tx.type === 'interest' ? '💰' : '📤'}</span>
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-gray-900">
                          {tx.type === 'interest' ? 'Interest Payment' : 'Principal Payment'}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {new Date(tx.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {tx.note ? ` • ${tx.note}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[13px] font-semibold ${
                        tx.type === 'interest' ? 'text-amber-700' : 'text-emerald-700'
                      }`}>
                        {currencySymbol}{tx.amount.toLocaleString('en-IN')}
                      </span>
                      <button
                        onClick={() => removeTransaction(tx.id)}
                        className="text-gray-300 hover:text-red-500 p-0.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Summary + Analysis */}
        <div className="lg:col-span-3 space-y-5">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-3.5 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-wider opacity-90">Monthly Interest</p>
              <p className="text-lg font-bold mt-1">{currencySymbol}{formatINR(Math.round(currentMonthlyInterest))}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3.5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Outstanding</p>
              <p className="text-lg font-bold text-indigo-600 mt-1">{currencySymbol}{formatINR(Math.round(outstanding))}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3.5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Current Rate</p>
              <p className="text-lg font-bold text-amber-600 mt-1">{rateNum}%</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3.5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total Interest Paid</p>
              <p className="text-lg font-bold text-indigo-700 mt-1">{currencySymbol}{formatINR(totalInterestPaid)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-3.5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Accrued Interest</p>
              <p className="text-lg font-bold text-emerald-600 mt-1">{currencySymbol}{formatINR(Math.round(accruedInterest))}</p>
              <p className="text-[10px] text-emerald-500 mt-0.5">Unpaid interest balance</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3.5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Principal Paid</p>
              <p className="text-lg font-bold text-indigo-600 mt-1">{currencySymbol}{formatINR(principalPaid)}</p>
              <p className="text-[10px] text-indigo-500 mt-0.5">{principalNum > 0 ? (principalPaid / principalNum * 100).toFixed(1) : '0.0'}% of principal</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3.5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Original Principal</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{currencySymbol}{formatINR(principalNum)}</p>
            </div>
          </div>

          {/* Analysis Section */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center border-b border-gray-200">
              <button
                onClick={() => setAnalysisTab('analysis')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-colors ${
                  analysisTab === 'analysis' ? 'text-amber-700 border-b-2 border-amber-600 bg-amber-50/50' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" /></svg>
                Analysis
              </button>
              <button
                onClick={() => setAnalysisTab('schedule')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-colors ${
                  analysisTab === 'schedule' ? 'text-amber-700 border-b-2 border-amber-600 bg-amber-50/50' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>
                Schedule
              </button>
              <div className="flex-1" />
              {/* <button className="p-2 mr-2 text-gray-400 hover:text-gray-600 transition-colors" title="Download">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              </button> */}
            </div>

            <div className="p-4 sm:p-5">
              {analysisTab === 'analysis' && (
                <div className="space-y-5">
                  {/* Donut Chart */}
                  <div className="flex flex-col items-center py-4">
                    <div className="relative w-48 h-48">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                        {principalNum > 0 && (
                          <circle
                            cx="50" cy="50" r="40" fill="none"
                            stroke="#6366f1"
                            strokeWidth="12"
                            strokeDasharray={`${outstanding > 0 ? (currentPrincipal / outstanding * 251.2) : 251.2} 251.2`}
                            strokeLinecap="round"
                          />
                        )}
                        {accruedInterest > 0 && outstanding > 0 && (
                          <circle
                            cx="50" cy="50" r="40" fill="none"
                            stroke="#f59e0b"
                            strokeWidth="12"
                            strokeDasharray={`${(accruedInterest / outstanding * 251.2)} 251.2`}
                            strokeDashoffset={`${-(currentPrincipal / outstanding * 251.2)}`}
                            strokeLinecap="round"
                          />
                        )}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-[11px] text-gray-400 font-medium">Total Payable</p>
                        <p className="text-xl font-bold text-gray-900">{formatINR(Math.round(outstanding))}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 mt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                        <div>
                          <p className="text-[11px] text-gray-400">Principal</p>
                          <p className="text-[13px] font-bold text-gray-900">{currencySymbol}{formatINR(principalNum)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        <div>
                          <p className="text-[11px] text-gray-400">Total Interest</p>
                          <p className="text-[13px] font-bold text-gray-900">{currencySymbol}{formatINR(Math.round(totalInterestPaid + accruedInterest))}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Paid & Outstanding Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Paid</p>
                      </div>
                      <p className="text-lg font-bold text-emerald-700">{currencySymbol}{formatINR(Math.round(principalPaid + totalInterestPaid))}</p>
                      <p className="text-[10px] text-gray-500 mt-1">Principal: {currencySymbol}{formatINR(principalPaid)}</p>
                      <p className="text-[10px] text-gray-500">Interest: {currencySymbol}{formatINR(totalInterestPaid)}</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Outstanding</p>
                      </div>
                      <p className="text-lg font-bold text-amber-700">{currencySymbol}{formatINR(Math.round(outstanding))}</p>
                      <p className="text-[10px] text-gray-500 mt-1">Principal: {currencySymbol}{formatINR(Math.round(currentPrincipal))}</p>
                      <p className="text-[10px] text-gray-500">Accrued Int: {currencySymbol}{formatINR(Math.round(accruedInterest))}</p>
                    </div>
                  </div>
                </div>
              )}

              {analysisTab === 'schedule' && (
                <div className="overflow-x-auto -mx-4 sm:-mx-5">
                  {schedule.length > 0 ? (
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left font-semibold text-gray-500 uppercase tracking-wider px-4 py-2">#</th>
                          <th className="text-left font-semibold text-gray-500 uppercase tracking-wider px-2 py-2">Date</th>
                          <th className="text-right font-semibold text-gray-500 uppercase tracking-wider px-2 py-2">Interest</th>
                          <th className="text-right font-semibold text-gray-500 uppercase tracking-wider px-2 py-2">Int. Paid</th>
                          <th className="text-right font-semibold text-gray-500 uppercase tracking-wider px-2 py-2">Prin. Paid</th>
                          <th className="text-right font-semibold text-gray-500 uppercase tracking-wider px-4 py-2">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {schedule.map((row) => (
                          <tr
                            key={row.month}
                            className={`hover:bg-gray-50/50 ${(row.intPaid > 0 || row.prinPaid > 0) ? 'bg-emerald-50/30' : ''}`}
                          >
                            <td className="px-4 py-2 text-gray-500">{row.month}</td>
                            <td className="px-2 py-2 text-gray-700 whitespace-nowrap">{row.date}</td>
                            <td className="px-2 py-2 text-right text-amber-600">{formatINR(Math.round(row.interest))}</td>
                            <td className="px-2 py-2 text-right text-emerald-600">{row.intPaid > 0 ? formatINR(Math.round(row.intPaid)) : '—'}</td>
                            <td className="px-2 py-2 text-right text-emerald-600">{row.prinPaid > 0 ? formatINR(Math.round(row.prinPaid)) : '—'}</td>
                            <td className="px-4 py-2 text-right font-medium text-gray-900">
                              {formatINR(Math.round(row.balance))}
                              {row.accrued > 0 && (
                                <span className="ml-1 text-[10px] text-red-500">+{formatINR(Math.round(row.accrued))}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-center text-[13px] text-gray-400 py-8">Enter loan details to see the schedule</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {showTxForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowTxForm(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Add Transaction</h2>
              <button
                type="button"
                onClick={() => setShowTxForm(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-gray-900 mb-2">Type</label>
              <div className="space-y-2">
                {([
                  { key: 'interest' as const, label: 'Interest Payment', desc: 'Clear accrued interest' },
                  { key: 'principal' as const, label: 'Principal Payment', desc: 'Interest must be cleared first' },
                  { key: 'rate_change' as const, label: 'Rate Change', desc: 'Update interest rate' },
                ] as const).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => { setTxType(opt.key); setTxAmount(''); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                      txType === opt.key
                        ? 'border-amber-400 bg-amber-50/60'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      txType === opt.key ? 'border-amber-500' : 'border-gray-300'
                    }`}>
                      {txType === opt.key && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-gray-900">{opt.label}</p>
                      <p className="text-[11px] text-gray-400">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-gray-900 mb-2">Date</label>
              <input
                type="date"
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[13px] font-bold text-gray-900">
                  {txType === 'rate_change' ? 'New Rate (%)' : 'Amount'}
                </label>
                {txType === 'interest' && accruedInterest > 0 && (
                  <button type="button" onClick={() => setTxAmount(String(Math.round(accruedInterest)))} className="text-[12px] font-medium text-amber-600 hover:text-amber-700 hover:underline transition-colors cursor-pointer">Max: {currencySymbol}{formatINR(Math.round(accruedInterest))}</button>
                )}
                {txType === 'principal' && currentPrincipal > 0 && (
                  <button type="button" onClick={() => setTxAmount(String(Math.round(currentPrincipal)))} className="text-[12px] font-medium text-amber-600 hover:text-amber-700 hover:underline transition-colors cursor-pointer">Max: {currencySymbol}{formatINR(Math.round(currentPrincipal))}</button>
                )}
              </div>
              <div className="relative">
                {txType !== 'rate_change' && (
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] text-gray-400">{currencySymbol}</span>
                )}
                <input
                  type="number"
                  min="0"
                  step={txType === 'rate_change' ? '0.01' : '1'}
                  placeholder={txType === 'rate_change' ? 'e.g., 12.5' : 'e.g., 1000'}
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className={`w-full border border-gray-200 rounded-xl py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                    txType !== 'rate_change' ? 'pl-8 pr-4' : 'px-4'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-gray-900 mb-2">Notes <span className="font-normal text-gray-400">(optional)</span></label>
              <input
                type="text"
                placeholder="e.g., Quarterly interest clearance"
                value={txNote}
                onChange={(e) => setTxNote(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowTxForm(false)}
                className="flex-1 px-4 py-3 text-[14px] font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addTransaction}
                disabled={!txAmount}
                className="flex-1 px-4 py-3 bg-amber-500/80 text-white text-[14px] font-semibold rounded-xl hover:bg-amber-500 transition-colors disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
