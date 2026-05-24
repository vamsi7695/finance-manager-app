import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useHome } from '../context/HomeContext';
import type { Loan, Prepayment } from '../types';

const loanTypes = [
  { key: 'Home', emoji: '🏠', label: 'Home Loan' },
  { key: 'Personal', emoji: '💳', label: 'Personal Loan' },
  { key: 'Car', emoji: '🚗', label: 'Car Loan' },
  { key: 'Education', emoji: '🎓', label: 'Education Loan' },
  { key: 'Gold', emoji: '🪙', label: 'Gold Loan' },
  { key: 'Business', emoji: '💼', label: 'Business Loan' },
];

function padDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function calcEMI(principal: number, annualRate: number, months: number) {
  if (months <= 0 || principal <= 0) return 0;
  if (annualRate <= 0) return principal / months;
  const r = annualRate / 12 / 100;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

function formatINR(val: number) {
  if (val >= 10000000) return `${(val / 10000000).toFixed(2)}L Cr`;
  if (val >= 100000) return `${(val / 100000).toFixed(2)}L`;
  if (val >= 1000) return val.toLocaleString('en-IN');
  return val.toLocaleString('en-IN');
}

function addMonths(dateStr: string, months: number) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

type AnalysisTab = 'analysis' | 'report' | 'table';
type AnalysisView = 'current' | 'planned';

export default function LoanDetail() {
  const { homeId, loanId } = useParams<{ homeId: string; loanId: string }>();
  const navigate = useNavigate();
  const { currencySymbol } = useHome();
  const isNew = loanId === 'new';

  const [type, setType] = useState('Home');
  const [lender, setLender] = useState('');
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [tenureYears, setTenureYears] = useState('');
  const [startDate, setStartDate] = useState(padDate(new Date()).slice(0, 7)); // YYYY-MM
  const [prepayments, setPrepayments] = useState<Prepayment[]>([]);
  const [showPrepaymentForm, setShowPrepaymentForm] = useState(false);
  const [adjMode, setAdjMode] = useState<'part-payment' | 'rate-change'>('part-payment');
  const [ppMonth, setPpMonth] = useState('');
  const [ppAmount, setPpAmount] = useState('');
  const [ppType, setPpType] = useState<'reduce-tenure' | 'reduce-emi'>('reduce-tenure');
  const [ppDay, setPpDay] = useState('');
  const [ppFrequency, setPpFrequency] = useState<'one-time' | 'monthly' | 'quarterly' | 'yearly'>('one-time');
  const [ppNewRate, setPpNewRate] = useState('');
  const [analysisTab, setAnalysisTab] = useState<AnalysisTab>('analysis');
  const [analysisView, setAnalysisView] = useState<AnalysisView>('current');
  const [saving, setSaving] = useState(false);
  const [loanData, setLoanData] = useState<Loan | null>(null);

  useEffect(() => {
    if (!isNew && loanId) {
      api.get('/loans').then((res) => {
        const found = res.data.find((l: Loan) => String(l.id) === String(loanId));
        if (found) {
          setLoanData(found);
          setType(found.type);
          setLender(found.lender);
          setPrincipal(String(found.principalAmount));
          setRate(String(found.interestRate));
          const tenure = found.tenureMonths || (found.endDate && found.startDate ? Math.round(((new Date(found.endDate + 'T00:00:00')).getTime() - (new Date(found.startDate + 'T00:00:00')).getTime()) / (1000 * 60 * 60 * 24 * 30.44)) : 0);
          setTenureYears(String(Math.round(tenure / 12)));
          setStartDate(found.startDate.slice(0, 7));
          if (found.prepayments) {
            try { setPrepayments(JSON.parse(found.prepayments)); } catch { /* ignore */ }
          }
        }
      });
    }
  }, [loanId]);

  // Lock body scroll
  useEffect(() => {
    if (showPrepaymentForm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showPrepaymentForm]);

  const principalNum = parseFloat(principal) || 0;
  const rateNum = parseFloat(rate) || 0;
  const tenureMonths = (parseFloat(tenureYears) || 0) * 12;

  const emi = useMemo(() => calcEMI(principalNum, rateNum, tenureMonths), [principalNum, rateNum, tenureMonths]);
  const totalPayment = emi * tenureMonths;
  const totalInterest = totalPayment - principalNum;

  // Generate amortization schedule
  const schedule = useMemo(() => {
    if (principalNum <= 0 || rateNum <= 0 || tenureMonths <= 0) return [];
    const rows: { month: number; date: string; emi: number; principal: number; interest: number; prepayment: number; balance: number }[] = [];
    let balance = principalNum;
    let currentRate = rateNum;
    let r = currentRate / 12 / 100;
    let currentEmi = emi;

    for (let m = 1; m <= tenureMonths && balance > 0.01; m++) {
      // Check for rate changes this month
      const rateChanges = prepayments.filter(p => p.kind === 'rate-change' && p.month === m);
      for (const rc of rateChanges) {
        if (rc.newRate) {
          currentRate = rc.newRate;
          r = currentRate / 12 / 100;
          const remainingMonths = tenureMonths - m + 1;
          if (remainingMonths > 0) currentEmi = calcEMI(balance, currentRate, remainingMonths);
        }
      }

      const interestPart = balance * r;
      let principalPart = Math.min(currentEmi - interestPart, balance);
      if (principalPart < 0) principalPart = 0;
      balance -= principalPart;

      // Check for prepayments this month (part-payments only)
      const pp = prepayments.filter(p => p.month === m && p.kind !== 'rate-change');
      let ppTotal = 0;
      for (const p of pp) {
        ppTotal += p.amount;
        balance = Math.max(0, balance - p.amount);
        if (p.type === 'reduce-emi' && balance > 0) {
          const remainingMonths = tenureMonths - m;
          if (remainingMonths > 0) currentEmi = calcEMI(balance, currentRate, remainingMonths);
        }
      }

      const dStr = addMonths(startDate + '-01', m - 1);
      rows.push({ month: m, date: dStr, emi: currentEmi, principal: principalPart, interest: interestPart, prepayment: ppTotal, balance: Math.max(0, balance) });
      if (balance <= 0.01) break;
    }
    return rows;
  }, [principalNum, rateNum, tenureMonths, emi, prepayments, startDate]);

  const actualTotalInterest = schedule.reduce((s, r) => s + r.interest, 0);
  const actualTotalPaid = schedule.reduce((s, r) => s + r.emi + r.prepayment, 0);
  const actualEndMonth = schedule.length > 0 ? schedule[schedule.length - 1].date : '';
  const paidSoFar = useMemo(() => {
    if (!loanData || !schedule.length) return { principal: 0, interest: 0 };
    const now = new Date();
    const start = new Date(startDate + '-01T00:00:00');
    const elapsedMonths = Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth());
    const paidRows = schedule.slice(0, elapsedMonths);
    return {
      principal: paidRows.reduce((s, r) => s + r.principal + r.prepayment, 0),
      interest: paidRows.reduce((s, r) => s + r.interest, 0),
    };
  }, [schedule, startDate, loanData]);

  const handleSave = async (goBack = true) => {
    if (!principal || !rate || !tenureYears || !lender) return;
    setSaving(true);
    try {
      const endDate = (() => {
        const d = new Date(startDate + '-01T00:00:00');
        d.setMonth(d.getMonth() + tenureMonths);
        return padDate(d);
      })();
      const payload = {
        lender,
        type,
        principalAmount: principalNum,
        interestRate: rateNum,
        emiAmount: Math.round(emi * 100) / 100,
        startDate: startDate + '-01',
        endDate,
        outstandingBalance: Math.max(0, principalNum - paidSoFar.principal),
        tenureMonths,
        prepayments: prepayments.length > 0 ? JSON.stringify(prepayments) : null,
        status: 'ACTIVE',
      };
      if (isNew) {
        await api.post('/loans', payload);
      } else {
        await api.put(`/loans/${loanId}`, payload);
      }
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

  const addPrepayment = () => {
    if (!ppMonth) return;
    if (adjMode === 'part-payment') {
      if (!ppAmount) return;
      const freq = ppFrequency;
      const base: Prepayment = {
        id: Date.now().toString(),
        month: parseInt(ppMonth),
        amount: parseFloat(ppAmount),
        type: ppType,
        kind: 'part-payment',
        day: ppDay ? parseInt(ppDay) : undefined,
        frequency: freq,
      };
      if (freq === 'one-time') {
        setPrepayments([...prepayments, base]);
      } else {
        // Generate recurring entries
        const interval = freq === 'monthly' ? 1 : freq === 'quarterly' ? 3 : 12;
        const newPPs: Prepayment[] = [];
        for (let m = parseInt(ppMonth); m <= tenureMonths; m += interval) {
          newPPs.push({ ...base, id: `${Date.now()}-${m}`, month: m });
        }
        setPrepayments([...prepayments, ...newPPs]);
      }
    } else {
      if (!ppNewRate) return;
      setPrepayments([...prepayments, {
        id: Date.now().toString(),
        month: parseInt(ppMonth),
        amount: 0,
        type: ppType,
        kind: 'rate-change',
        newRate: parseFloat(ppNewRate),
        day: ppDay ? parseInt(ppDay) : undefined,
      }]);
    }
    setPpMonth('');
    setPpAmount('');
    setPpNewRate('');
    setPpDay('');
    setPpFrequency('one-time');
    setShowPrepaymentForm(false);
  };

  const removePrepayment = (id: string) => {
    setPrepayments(prepayments.filter(p => p.id !== id));
  };

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
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Loan Manager</h1>
        <div className="flex items-center gap-1.5">
          {!isNew && (
            <button onClick={handleDelete} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
            </button>
          )}
          <button onClick={() => handleSave(false)} disabled={saving || !principal || !rate || !tenureYears || !lender} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-gray-500 hover:text-indigo-700 hover:bg-indigo-50 border border-gray-200 transition-colors disabled:opacity-40" title="Save">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
            Save
          </button>
          <button onClick={() => handleSave(true)} disabled={saving || !principal || !rate || !tenureYears || !lender} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-white bg-indigo-500 hover:bg-indigo-600 transition-colors disabled:opacity-40" title="Save & Close">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.5 12.75l6 6 9-13.5" /></svg>
            Save & Close
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Form */}
        <div className="lg:col-span-2 space-y-5">
          {/* Loan Details Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 space-y-4 border-l-4 border-l-indigo-500">
            <h2 className="text-[15px] font-bold text-gray-900">Loan Details</h2>

            {/* Lender name */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Lender / Bank</label>
              <input
                type="text"
                required
                placeholder="e.g. HDFC Bank, SBI"
                value={lender}
                onChange={(e) => setLender(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Loan Type */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-500 mb-1.5">Loan Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M2%204l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-8"
              >
                {loanTypes.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Amount + Rate + Tenure */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-500 mb-1.5">Loan Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-gray-400">{currencySymbol}</span>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="5000000"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 mb-1.5">Interest Rate</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="9"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 pr-8 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-gray-400">%</span>
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 mb-1.5">Tenure (Years)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="40"
                    required
                    placeholder="20"
                    value={tenureYears}
                    onChange={(e) => setTenureYears(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 pr-8 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-gray-400">Yr</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-gray-500 mb-1.5">Start Date</label>
              <input
                type="month"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Adjustments Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 space-y-3 border-l-4 border-l-emerald-400">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-gray-900">Adjustments</h2>
              <button
                type="button"
                onClick={() => setShowPrepaymentForm(true)}
                className="text-[12px] font-medium text-indigo-600 hover:text-indigo-700"
              >
                + Add
              </button>
            </div>
            {prepayments.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-[12px] text-gray-400">No prepayments added.</p>
                <button
                  type="button"
                  onClick={() => setShowPrepaymentForm(true)}
                  className="mt-2 text-[12px] font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Add Adjustment
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {prepayments.sort((a, b) => a.month - b.month).map((pp) => (
                  <div key={pp.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-[13px] font-medium text-gray-900">
                        {pp.kind === 'rate-change'
                          ? `Rate → ${pp.newRate}% — Month ${pp.month}`
                          : `${currencySymbol}${pp.amount.toLocaleString()} — Month ${pp.month}`}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {pp.kind === 'rate-change' ? 'Rate change' : pp.type === 'reduce-tenure' ? 'Reduce tenure' : 'Reduce EMI'} • {addMonths(startDate + '-01', pp.month - 1)}
                        {pp.day ? ` (Day ${pp.day})` : ''}
                        {pp.frequency && pp.frequency !== 'one-time' ? ` • ${pp.frequency}` : ''}
                      </p>
                    </div>
                    <button onClick={() => removePrepayment(pp.id)} className="text-gray-400 hover:text-red-500 p-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
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
            <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl p-3.5 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-wider opacity-90">Monthly EMI</p>
              <p className="text-lg font-bold mt-1">{currencySymbol}{emi > 0 ? formatINR(Math.round(emi)) : '0'}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3.5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Outstanding</p>
              <p className="text-lg font-bold text-indigo-600 mt-1">{currencySymbol}{formatINR(Math.round(Math.max(0, principalNum - paidSoFar.principal)))}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3.5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Current Rate</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{rateNum}%</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3.5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Paid So Far</p>
              <p className="text-lg font-bold text-purple-600 mt-1">{currencySymbol}{formatINR(Math.round(paidSoFar.principal + paidSoFar.interest))}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-3.5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total Interest</p>
              <p className="text-lg font-bold text-red-500 mt-1">{currencySymbol}{schedule.length > 0 ? formatINR(Math.round(actualTotalInterest)) : formatINR(Math.round(Math.max(0, totalInterest)))}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3.5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total Payment</p>
              <p className="text-lg font-bold text-indigo-600 mt-1">{currencySymbol}{schedule.length > 0 ? formatINR(Math.round(actualTotalPaid)) : formatINR(Math.round(totalPayment))}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3.5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Completion</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{actualEndMonth || (tenureMonths > 0 ? addMonths(startDate + '-01', tenureMonths) : '—')}</p>
            </div>
          </div>

          {/* Analysis Section */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Tabs */}
            <div className="flex items-center border-b border-gray-200">
              <button
                onClick={() => setAnalysisTab('analysis')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-colors ${
                  analysisTab === 'analysis' ? 'text-indigo-700 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" /></svg>
                Analysis
              </button>
              <button
                onClick={() => setAnalysisTab('report')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-colors ${
                  analysisTab === 'report' ? 'text-indigo-700 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                Report
              </button>
              <button
                onClick={() => setAnalysisTab('table')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-colors ${
                  analysisTab === 'table' ? 'text-indigo-700 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>
                Table
              </button>
              <div className="flex-1" />
              {/* <button className="p-2 mr-2 text-gray-400 hover:text-gray-600 transition-colors" title="Download">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              </button> */}
            </div>

            <div className="p-4 sm:p-5">
              {analysisTab === 'analysis' && (
                <div className="space-y-5">
                  {/* Current / After Planned Toggle */}
                  <div className="flex justify-center">
                    <div className="inline-flex bg-gray-100 rounded-lg p-0.5">
                      <button
                        onClick={() => setAnalysisView('current')}
                        className={`px-5 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                          analysisView === 'current' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Current
                      </button>
                      <button
                        onClick={() => setAnalysisView('planned')}
                        className={`px-5 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                          analysisView === 'planned' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        After Planned
                      </button>
                    </div>
                  </div>

                  {/* Donut Chart */}
                  {(() => {
                    const dispTotalPaid = schedule.length > 0 ? actualTotalPaid : totalPayment;
                    const dispInterest = schedule.length > 0 ? actualTotalInterest : Math.max(0, totalInterest);
                    const dispPrincipal = principalNum;
                    const dispTotal = dispPrincipal + dispInterest;
                    const principalPct = dispTotal > 0 ? (dispPrincipal / dispTotal) * 251.2 : 0;
                    const interestPct = dispTotal > 0 ? (dispInterest / dispTotal) * 251.2 : 0;
                    return (
                      <div className="flex flex-col items-center py-4">
                        <div className="relative w-48 h-48">
                          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                            <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                            {dispPrincipal > 0 && (
                              <circle cx="50" cy="50" r="40" fill="none" stroke="#6366f1" strokeWidth="12" strokeDasharray={`${principalPct} 251.2`} strokeLinecap="round" />
                            )}
                            {dispInterest > 0 && (
                              <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" strokeWidth="12" strokeDasharray={`${interestPct} 251.2`} strokeDashoffset={`${-principalPct}`} strokeLinecap="round" />
                            )}
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <p className="text-[11px] text-gray-400 font-medium">Total Payable</p>
                            <p className="text-xl font-bold text-gray-900">{formatINR(Math.round(dispTotalPaid))}</p>
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
                              <p className="text-[11px] text-gray-400">Interest ({analysisView === 'current' ? 'Current' : 'Planned'})</p>
                              <p className="text-[13px] font-bold text-gray-900">{currencySymbol}{formatINR(Math.round(dispInterest))}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Cleared & Pending Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Cleared</p>
                      </div>
                      <p className="text-lg font-bold text-emerald-700">{currencySymbol}{formatINR(Math.round(paidSoFar.principal + paidSoFar.interest))}</p>
                      <p className="text-[10px] text-gray-500 mt-1">Principal: {currencySymbol}{formatINR(Math.round(paidSoFar.principal))}</p>
                      <p className="text-[10px] text-gray-500">Interest: {currencySymbol}{formatINR(Math.round(paidSoFar.interest))}</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Pending</p>
                      </div>
                      <p className="text-lg font-bold text-amber-700">{currencySymbol}{formatINR(Math.round((schedule.length > 0 ? actualTotalPaid : totalPayment) - paidSoFar.principal - paidSoFar.interest))}</p>
                      <p className="text-[10px] text-gray-500 mt-1">Principal: {currencySymbol}{formatINR(Math.round(principalNum - paidSoFar.principal))}</p>
                      <p className="text-[10px] text-gray-500">Interest: {currencySymbol}{formatINR(Math.round((schedule.length > 0 ? actualTotalInterest : Math.max(0, totalInterest)) - paidSoFar.interest))}</p>
                    </div>
                  </div>
                </div>
              )}

              {analysisTab === 'report' && (
                <div className="space-y-4">
                  {/* Principal vs Interest breakdown bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider">Total Payable</p>
                      <p className="text-[15px] font-bold text-gray-900">{currencySymbol}{schedule.length > 0 ? formatINR(Math.round(actualTotalPaid)) : formatINR(Math.round(totalPayment))}</p>
                    </div>
                    {principalNum > 0 && (
                      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
                        <div className="h-full bg-indigo-500 rounded-l-full" style={{ width: `${(principalNum / (schedule.length > 0 ? actualTotalPaid : totalPayment) * 100) || 0}%` }} />
                        <div className="h-full bg-amber-400 rounded-r-full" style={{ width: `${((schedule.length > 0 ? actualTotalInterest : Math.max(0, totalInterest)) / (schedule.length > 0 ? actualTotalPaid : totalPayment) * 100) || 0}%` }} />
                      </div>
                    )}
                    <div className="flex gap-4 mt-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                        <span className="text-[11px] text-gray-500">Principal</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        <span className="text-[11px] text-gray-500">Interest</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Principal</p>
                      <p className="text-[14px] font-bold text-gray-900">{currencySymbol}{formatINR(principalNum)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Interest</p>
                      <p className="text-[14px] font-bold text-red-500">{currencySymbol}{schedule.length > 0 ? formatINR(Math.round(actualTotalInterest)) : formatINR(Math.round(Math.max(0, totalInterest)))}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">EMI Count</p>
                      <p className="text-[14px] font-bold text-gray-900">{schedule.length || tenureMonths} months</p>
                    </div>
                  </div>
                </div>
              )}

              {analysisTab === 'table' && (
                <div className="overflow-x-auto -mx-4 sm:-mx-5">
                  {schedule.length > 0 ? (
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left font-semibold text-gray-500 uppercase tracking-wider px-4 py-2">#</th>
                          <th className="text-left font-semibold text-gray-500 uppercase tracking-wider px-2 py-2">Date</th>
                          <th className="text-right font-semibold text-gray-500 uppercase tracking-wider px-2 py-2">EMI</th>
                          <th className="text-right font-semibold text-gray-500 uppercase tracking-wider px-2 py-2">Principal</th>
                          <th className="text-right font-semibold text-gray-500 uppercase tracking-wider px-2 py-2">Interest</th>
                          <th className="text-right font-semibold text-gray-500 uppercase tracking-wider px-4 py-2">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {schedule.map((row) => (
                          <tr key={row.month} className={`hover:bg-gray-50/50 ${row.prepayment > 0 ? 'bg-emerald-50/30' : ''}`}>
                            <td className="px-4 py-2 text-gray-500">{row.month}</td>
                            <td className="px-2 py-2 text-gray-700 whitespace-nowrap">{row.date}</td>
                            <td className="px-2 py-2 text-right font-medium text-gray-900">{formatINR(Math.round(row.emi))}</td>
                            <td className="px-2 py-2 text-right text-indigo-600">{formatINR(Math.round(row.principal))}</td>
                            <td className="px-2 py-2 text-right text-red-500">{formatINR(Math.round(row.interest))}</td>
                            <td className="px-4 py-2 text-right font-medium text-gray-900">
                              {formatINR(Math.round(row.balance))}
                              {row.prepayment > 0 && (
                                <span className="ml-1 text-[10px] text-emerald-600">-{formatINR(row.prepayment)}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-center text-[13px] text-gray-400 py-8">Enter loan details to see the amortization schedule</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Adjustment Modal */}
      {showPrepaymentForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPrepaymentForm(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Add Adjustment</h2>
              <button type="button" onClick={() => setShowPrepaymentForm(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Part Payment / Rate Change toggle */}
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setAdjMode('part-payment')}
                className={`flex-1 px-4 py-2.5 rounded-lg text-[14px] font-semibold transition-all ${
                  adjMode === 'part-payment'
                    ? 'bg-white text-indigo-700 shadow-sm border-2 border-indigo-500'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Part Payment
              </button>
              <button
                type="button"
                onClick={() => setAdjMode('rate-change')}
                className={`flex-1 px-4 py-2.5 rounded-lg text-[14px] font-semibold transition-all ${
                  adjMode === 'rate-change'
                    ? 'bg-white text-indigo-700 shadow-sm border-2 border-indigo-500'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Rate Change
              </button>
            </div>

            {/* Amount / Rate field */}
            {adjMode === 'part-payment' ? (
              <div>
                <label className="block text-[13px] font-bold text-gray-900 mb-2">Payment Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] text-gray-400">{currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 50000"
                    value={ppAmount}
                    onChange={(e) => setPpAmount(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[13px] font-bold text-gray-900 mb-2">New Interest Rate</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 9.2"
                    value={ppNewRate}
                    onChange={(e) => setPpNewRate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 pr-10 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-gray-400">%</span>
                </div>
              </div>
            )}

            {/* Starts at Month dropdown */}
            <div>
              <label className="block text-[13px] font-bold text-gray-900 mb-2">Starts at Month</label>
              <select
                value={ppMonth}
                onChange={(e) => setPpMonth(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M2%204l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-8"
              >
                <option value="">Select Month</option>
                {Array.from({ length: Math.min(tenureMonths || 60, 360) }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m} — {addMonths(startDate + '-01', m - 1)}</option>
                ))}
              </select>
            </div>

            {/* Effect radio buttons */}
            <div>
              <label className="block text-[13px] font-bold text-gray-900 mb-2">Effect</label>
              <div className="flex items-center gap-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="ppEffect"
                    checked={ppType === 'reduce-tenure'}
                    onChange={() => setPpType('reduce-tenure')}
                    className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="text-[14px] text-gray-700">Change Tenure</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="ppEffect"
                    checked={ppType === 'reduce-emi'}
                    onChange={() => setPpType('reduce-emi')}
                    className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="text-[14px] text-gray-700">Change EMI</span>
                </label>
              </div>
            </div>

            {/* Payment Day / Effective Day */}
            <div>
              <label className="block text-[13px] font-bold text-gray-900 mb-2">
                {adjMode === 'part-payment' ? 'Payment Day' : 'Effective Day'} <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="number"
                min="1"
                max="31"
                placeholder="e.g. 11"
                value={ppDay}
                onChange={(e) => setPpDay(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-[12px] text-gray-400 mt-1.5 italic">
                {adjMode === 'part-payment'
                  ? 'Day of month when prepayment was made. Adjusts interest for partial month.'
                  : 'Day of month when rate changed. Splits interest between old and new rates.'}
              </p>
            </div>

            {/* Frequency - only for Part Payment */}
            {adjMode === 'part-payment' && (
              <div>
                <label className="block text-[13px] font-bold text-gray-900 mb-2">Frequency</label>
                <select
                  value={ppFrequency}
                  onChange={(e) => setPpFrequency(e.target.value as typeof ppFrequency)}
                  className="w-fit border border-gray-200 rounded-xl px-4 py-3 text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M2%204l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-8"
                >
                  <option value="one-time">One-time</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            )}

            {/* Cancel + Add buttons */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowPrepaymentForm(false)}
                className="flex-1 px-4 py-3 text-[14px] font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addPrepayment}
                disabled={!ppMonth || (adjMode === 'part-payment' ? !ppAmount : !ppNewRate)}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white text-[14px] font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-40"
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
