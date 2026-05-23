import { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import { useHome } from '../context/HomeContext';
import { useAuth } from '../context/AuthContext';
import type { Expense, RecurringExpense } from '../types';

const categories = [
  { key: 'All', emoji: '\uD83D\uDDC2\uFE0F', label: 'All' },
  { key: 'Housing', emoji: '\uD83C\uDFE0', label: 'Housing' },
  { key: 'Groceries', emoji: '\uD83D\uDED2', label: 'Groceries' },
  { key: 'Online Shopping', emoji: '\uD83D\uDECD\uFE0F', label: 'Online Shopping' },
  { key: 'Food & Dining', emoji: '\uD83C\uDF7D\uFE0F', label: 'Food & Dining' },
  { key: 'Transport', emoji: '\uD83D\uDE97', label: 'Transport' },
  { key: 'Health & Medical', emoji: '\uD83D\uDC8A', label: 'Health & Medical' },
  { key: 'Education', emoji: '\uD83C\uDF93', label: 'Education' },
  { key: 'Clothing & Personal', emoji: '\uD83D\uDC57', label: 'Clothing & Personal' },
  { key: 'Entertainment', emoji: '\uD83C\uDFAC', label: 'Entertainment' },
  { key: 'Bills & Subscriptions', emoji: '\uD83D\uDCF1', label: 'Bills & Subscriptions' },
  { key: 'Travel & Holidays', emoji: '\u2708\uFE0F', label: 'Travel & Holidays' },
  { key: 'Gifts & Donations', emoji: '\uD83C\uDF81', label: 'Gifts & Donations' },
  { key: 'Finance', emoji: '\uD83D\uDCB0', label: 'Finance' },
  { key: 'Miscellaneous', emoji: '\uD83E\uDDFE', label: 'Miscellaneous' },
];

const subCategories: Record<string, string[]> = {
  'Housing': ['Rent', 'Mortgage / EMI', 'Maintenance', 'Utilities', 'Furnishing', 'Decor', 'Cleaning', 'Other'],
  'Groceries': ['Fruits & Vegetables', 'Dairy', 'Meat & Seafood', 'Snacks', 'Beverages', 'Household Supplies', 'Baby & Kids', 'Other'],
  'Online Shopping': ['Electronics', 'Fashion', 'Home & Kitchen', 'Beauty', 'Books', 'Sports & Fitness', 'Toys & Games', 'Other'],
  'Food & Dining': ['Restaurants', 'Takeaway', 'Food Delivery', 'Coffee & Cafe', 'Street Food', 'Sweets & Bakery', 'Quick Bites', 'Other'],
  'Transport': ['Fuel', 'Public Transit', 'Cab / Ride Share', 'Parking', 'Vehicle Maintenance', 'Tolls', 'Other'],
  'Health & Medical': ['Doctor Visit', 'Medicine', 'Lab Tests', 'Hospital', 'Insurance Premium', 'Dental', 'Eye Care', 'Other'],
  'Education': ['Tuition', 'Books & Supplies', 'Online Courses', 'Coaching', 'Exam Fees', 'Stationery', 'Other'],
  'Clothing & Personal': ['Clothing', 'Footwear', 'Accessories', 'Grooming', 'Salon / Spa', 'Skincare', 'Other'],
  'Entertainment': ['Movies & Shows', 'Games & Apps', 'Concerts & Events', 'Hobbies', 'Sports', 'Streaming', 'Other'],
  'Bills & Subscriptions': ['Electricity', 'Water', 'Gas', 'Internet', 'Mobile Recharge', 'Streaming Services', 'Insurance', 'Other'],
  'Travel & Holidays': ['Flights', 'Hotels', 'Train / Bus', 'Activities', 'Food on Trip', 'Shopping on Trip', 'Visa & Docs', 'Other'],
  'Gifts & Donations': ['Birthday Gifts', 'Wedding Gifts', 'Festival Gifts', 'Charity', 'Tips', 'Other'],
  'Finance': ['Investments', 'EMI Payment', 'Credit Card Bill', 'Taxes', 'Bank Fees', 'Insurance', 'Other'],
  'Miscellaneous': ['Household', 'Pets', 'Legal', 'Uncategorized', 'Other'],
};

function padDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: padDate(from),
    to: padDate(to),
  };
}

function formatDateHeading(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Expenses() {
  const { homeId } = useParams<{ homeId: string }>();
  const { currencySymbol } = useHome();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeTab, setActiveTab] = useState<'list' | 'reports' | 'recurring'>('list');
  const [search, setSearch] = useState('');
  const [includeTransfers, setIncludeTransfers] = useState(false);
  const defaultRange = getMonthRange();
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);
  const [form, setForm] = useState({
    amount: '',
    category: 'Food & Dining',
    subCategory: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash',
    paidBy: '',
  });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [markAsTransfer, setMarkAsTransfer] = useState(false);
  const [rewardEligibility, setRewardEligibility] = useState('full');
  const [members, setMembers] = useState<{ id: string; name: string; picture?: string }[]>([]);

  // Recurring state
  const [recurringRules, setRecurringRules] = useState<RecurringExpense[]>([]);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [editingRecurringId, setEditingRecurringId] = useState<string | null>(null);
  const [recurringForm, setRecurringForm] = useState({
    label: '',
    amount: '',
    frequency: 'Monthly',
    dayOfMonth: new Date().getDate(),
    startDate: padDate(new Date()),
    endDate: '',
    category: 'Housing',
    subCategory: '',
    paymentMethod: 'Cash',
    paidBy: '',
    description: '',
  });
  const [rTags, setRTags] = useState<string[]>([]);
  const [rTagInput, setRTagInput] = useState('');
  const [rMarkAsTransfer, setRMarkAsTransfer] = useState(false);
  const [rRewardEligibility, setRRewardEligibility] = useState('full');
  const [rActive, setRActive] = useState(true);

  const loadExpenses = () => {
    api.get('/expenses').then((res) => setExpenses(res.data)).catch(() => {});
  };

  const loadRecurring = () => {
    api.get('/recurring-expenses').then((res) => setRecurringRules(res.data)).catch(() => {});
  };

  useEffect(() => {
    loadExpenses();
    loadRecurring();
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

  // Lock body scroll when any modal is open
  useEffect(() => {
    if (showForm || showRecurringForm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showForm, showRecurringForm]);

  const handleRecurringSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const finalTags = [...rTags];
      const pendingTag = rTagInput.trim().toLowerCase();
      if (pendingTag && finalTags.length < 8 && !finalTags.includes(pendingTag)) {
        finalTags.push(pendingTag);
      }
      const payload = {
        ...recurringForm,
        amount: parseFloat(recurringForm.amount),
        endDate: recurringForm.endDate || null,
        tags: finalTags.length > 0 ? finalTags.join(',') : null,
        markAsTransfer: rMarkAsTransfer,
        rewardEligibility: rRewardEligibility,
        active: rActive,
        paidBy: recurringForm.paidBy || user?.name || '',
      };
      console.log('Recurring payload:', JSON.stringify(payload), 'editingId:', editingRecurringId);
      if (editingRecurringId) {
        const res = await api.put(`/recurring-expenses/${editingRecurringId}`, payload);
        console.log('PUT response:', res.status, res.data);
      } else {
        await api.post('/recurring-expenses', payload);
      }
      resetRecurringForm();
      loadRecurring();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status: number; data: unknown } };
      console.error('Recurring save failed:', axiosErr.response?.status, axiosErr.response?.data, err);
      alert(`Failed to save recurring rule: ${axiosErr.response?.status || 'Network error'}`);
    }
  };

  const resetRecurringForm = () => {
    setRecurringForm({ label: '', amount: '', frequency: 'Monthly', dayOfMonth: new Date().getDate(), startDate: padDate(new Date()), endDate: '', category: 'Housing', subCategory: '', paymentMethod: 'Cash', paidBy: '', description: '' });
    setRTags([]);
    setRTagInput('');
    setRMarkAsTransfer(false);
    setRRewardEligibility('full');
    setRActive(true);
    setEditingRecurringId(null);
    setShowRecurringForm(false);
  };

  const handleEditRecurring = (rule: RecurringExpense) => {
    setRecurringForm({
      label: rule.label,
      amount: String(rule.amount),
      frequency: rule.frequency,
      dayOfMonth: rule.dayOfMonth || 1,
      startDate: rule.startDate,
      endDate: rule.endDate || '',
      category: rule.category,
      subCategory: rule.subCategory || '',
      paymentMethod: rule.paymentMethod || 'Cash',
      paidBy: rule.paidBy || '',
      description: rule.description || '',
    });
    setRTags(rule.tags ? rule.tags.split(',') : []);
    setRMarkAsTransfer(rule.markAsTransfer || false);
    setRRewardEligibility(rule.rewardEligibility || 'full');
    setRActive(rule.active !== false);
    setEditingRecurringId(rule.id);
    setShowRecurringForm(true);
  };

  const handleDeleteRecurring = async (id: string) => {
    try {
      await api.delete(`/recurring-expenses/${id}`);
      loadRecurring();
    } catch { /* ignore */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Capture any pending tag input
      const finalTags = [...tags];
      const pendingTag = tagInput.trim().toLowerCase();
      if (pendingTag && finalTags.length < 8 && !finalTags.includes(pendingTag)) {
        finalTags.push(pendingTag);
      }
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        tags: finalTags.length > 0 ? finalTags.join(',') : null,
        markAsTransfer,
        rewardEligibility,
        paidBy: form.paidBy || user?.name || '',
      };
      if (editingId) {
        await api.put(`/expenses/${editingId}`, payload);
      } else {
        await api.post('/expenses', payload);
      }
      setForm({ amount: '', category: 'Food & Dining', subCategory: '', description: '', date: new Date().toISOString().split('T')[0], paymentMethod: 'Cash', paidBy: '' });
      setTags([]);
      setTagInput('');
      setMarkAsTransfer(false);
      setRewardEligibility('full');
      setEditingId(null);
      setShowForm(false);
      loadExpenses();
    } catch { /* ignore */ }
  };

  const handleEdit = (expense: Expense) => {
    setForm({
      amount: String(expense.amount),
      category: expense.category,
      subCategory: expense.subCategory || '',
      description: expense.description,
      date: expense.date,
      paymentMethod: expense.paymentMethod,
      paidBy: expense.paidBy || '',
    });
    setTags(expense.tags ? expense.tags.split(',') : []);
    setMarkAsTransfer(expense.markAsTransfer || false);
    setRewardEligibility(expense.rewardEligibility || 'full');
    setEditingId(expense.id);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ amount: '', category: 'Food & Dining', subCategory: '', description: '', date: new Date().toISOString().split('T')[0], paymentMethod: 'Cash', paidBy: '' });
    setTags([]);
    setTagInput('');
    setMarkAsTransfer(false);
    setRewardEligibility('full');
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && tags.length < 8 && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput('');
    }
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/expenses/${id}`);
    loadExpenses();
  };

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (e.date < dateFrom || e.date > dateTo) return false;
      if (activeCategory !== 'All' && e.category !== activeCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!e.category.toLowerCase().includes(q) && !e.description.toLowerCase().includes(q) && !e.paymentMethod.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [expenses, dateFrom, dateTo, activeCategory, search]);

  const total = filtered.reduce((s, e) => s + e.amount, 0);
  const avgPerTx = filtered.length > 0 ? total / filtered.length : 0;

  const grouped = useMemo(() => {
    const map: Record<string, Expense[]> = {};
    const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
    for (const e of sorted) {
      (map[e.date] ||= []).push(e);
    }
    return map;
  }, [filtered]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const e of expenses) {
      if (e.tags) e.tags.split(',').forEach(t => set.add(t.trim().toLowerCase()));
    }
    for (const r of recurringRules) {
      if (r.tags) r.tags.split(',').forEach(t => set.add(t.trim().toLowerCase()));
    }
    return Array.from(set).sort();
  }, [expenses, recurringRules]);

  const getCategoryEmoji = (cat: string) => {
    return categories.find((c) => c.key === cat)?.emoji || '\uD83E\uDDFE';
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      'Housing': 'bg-blue-50 ring-blue-100',
      'Groceries': 'bg-green-50 ring-green-100',
      'Online Shopping': 'bg-purple-50 ring-purple-100',
      'Food & Dining': 'bg-orange-50 ring-orange-100',
      'Transport': 'bg-cyan-50 ring-cyan-100',
      'Health & Medical': 'bg-red-50 ring-red-100',
      'Education': 'bg-indigo-50 ring-indigo-100',
      'Clothing & Personal': 'bg-pink-50 ring-pink-100',
      'Entertainment': 'bg-fuchsia-50 ring-fuchsia-100',
      'Bills & Subscriptions': 'bg-teal-50 ring-teal-100',
      'Travel & Holidays': 'bg-sky-50 ring-sky-100',
      'Gifts & Donations': 'bg-rose-50 ring-rose-100',
      'Finance': 'bg-emerald-50 ring-emerald-100',
      'Miscellaneous': 'bg-stone-50 ring-stone-100',
    };
    return colors[cat] || 'bg-gray-50 ring-gray-100';
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link to={`/homes/${homeId}`} className="text-gray-400 hover:text-gray-600 transition-colors" title="Back to Home">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 tracking-tight">Expenses</h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5 ml-6">Track and review household spending</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-[13px] font-medium rounded-lg transition-colors bg-indigo-600 text-white hover:bg-indigo-700 whitespace-nowrap shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Add Expense
        </button>
      </div>

      {/* Add Expense Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-start justify-center sm:pt-10 sm:pb-10 sm:px-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCloseForm} />
          <form onSubmit={handleSubmit} className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] sm:max-h-[calc(100vh-5rem)] overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-gray-900">{editingId ? 'Edit Expense' : 'Add Expense'}</h2>
              <button type="button" onClick={handleCloseForm} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

          {/* Date & Amount Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-700">Date</label>
              <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-700">Amount ({currencySymbol})</label>
              <input type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm" placeholder="0.00" />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-gray-700">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {categories.filter(c => c.key !== 'All').map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setForm({ ...form, category: c.key, subCategory: '' })}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium rounded-lg transition-colors ${
                    form.category === c.key
                      ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span>{c.emoji}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sub-category */}
          {subCategories[form.category] && (
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-gray-700">Sub-category</label>
              <div className="flex flex-wrap gap-1.5">
                {subCategories[form.category].map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setForm({ ...form, subCategory: sub })}
                    className={`px-2.5 py-1.5 text-[12px] font-medium rounded-lg transition-colors ${
                      form.subCategory === sub
                        ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Payment Method */}
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-gray-700">Payment Method</label>
            <div className="flex flex-wrap gap-1.5">
              {['Cash', 'UPI', 'Debit Card', 'Credit Card', 'Bank Transfer', 'Zaggle/Pluxee', 'Other'].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setForm({ ...form, paymentMethod: method })}
                  className={`px-3 py-1.5 text-[12px] font-medium rounded-lg transition-colors ${
                    form.paymentMethod === method
                      ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Paid by */}
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-gray-700">Paid by</label>
            <div className="flex flex-wrap gap-2">
              {(members.length > 0 ? members : user ? [{ id: user.id, name: user.name || 'You', picture: user.picture }] : []).map((m) => {
                const selected = form.paidBy === m.name || (!form.paidBy && m.id === user?.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setForm({ ...form, paidBy: m.name })}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                      selected
                        ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {m.picture ? (
                      <img src={m.picture} alt={m.name} className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                        <span className="text-[10px] font-semibold text-white">{m.name.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                    {m.name}
                    {m.id === user?.id && <span className="text-[11px] text-gray-400">(You)</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-gray-700">Note <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm" placeholder="e.g. Monthly groceries from D-Mart" />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-gray-700">Tags <span className="text-gray-400 font-normal">(optional, max 8)</span></label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm"
                placeholder="e.g. dmart, monthly, wedding"
              />
              <button type="button" onClick={addTag} disabled={tags.length >= 8} className="px-3 py-2 bg-gray-100 text-[13px] font-medium text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40">Add</button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-medium rounded-full">
                    {tag}
                    <button type="button" onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-red-500">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
            {tags.length < 8 && allTags.filter(t => !tags.includes(t)).length > 0 && (
              <div className="mt-2">
                <p className="text-[11px] text-gray-400 mb-1">Suggestions</p>
                <div className="flex flex-wrap gap-1">
                  {allTags.filter(t => !tags.includes(t)).map(t => (
                    <button key={t} type="button" onClick={() => { if (tags.length < 8) setTags([...tags, t]); }} className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mark as Transfer */}
          <div className="flex items-center justify-between py-3 border-t border-gray-100">
            <div>
              <p className="text-[13px] font-medium text-gray-700">Mark as Transfer</p>
              <p className="text-[11px] text-gray-400">Mark as a fund transfer or payment</p>
            </div>
            <button
              type="button"
              onClick={() => setMarkAsTransfer(!markAsTransfer)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${markAsTransfer ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${markAsTransfer ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Reward Eligibility */}
          <div className="space-y-2 py-3 border-t border-gray-100">
            <label className="text-[13px] font-medium text-gray-700">Reward Eligibility</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'full', label: 'Earn Full Rewards (Base + Bonus)' },
                { key: 'base', label: 'Base Rewards Only' },
                { key: 'none', label: 'No Rewards' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setRewardEligibility(opt.key)}
                  className={`px-3 py-1.5 text-[12px] font-medium rounded-lg transition-colors ${
                    rewardEligibility === opt.key
                      ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            {editingId ? (
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { handleDelete(editingId); handleCloseForm(); }} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  Delete
                </button>
                <button type="button" onClick={() => setEditingId(null)} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.5a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-3.868-3.13-7-7-7H6.75a9.06 9.06 0 00-1.5.124" /></svg>
                  Copy
                </button>
              </div>
            ) : <div />}
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleCloseForm} className="px-4 py-2 text-[13px] font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-[13px] font-medium rounded-lg hover:bg-indigo-700 transition-colors">{editingId ? 'Update Expense' : 'Add Expense'}</button>
            </div>
          </div>
        </form>
        </div>
      )}

      {/* Date Range & Transfers */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        {/* Month/Year Header with Navigation */}
        <div className="flex items-center justify-center gap-4 mb-3">
          <button
            type="button"
            onClick={() => {
              const d = new Date(dateFrom + 'T00:00:00');
              d.setMonth(d.getMonth() - 1);
              const from = new Date(d.getFullYear(), d.getMonth(), 1);
              const to = new Date(d.getFullYear(), d.getMonth() + 1, 0);
              setDateFrom(padDate(from));
              setDateTo(padDate(to));
            }}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-[15px] font-semibold text-gray-800 min-w-[220px] text-center">
            {(() => {
              const f = new Date(dateFrom + 'T00:00:00');
              const t = new Date(dateTo + 'T00:00:00');
              const fromLabel = f.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
              if (f.getMonth() === t.getMonth() && f.getFullYear() === t.getFullYear()) return fromLabel;
              const toLabel = t.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
              return `${fromLabel} – ${toLabel}`;
            })()}
          </h2>
          <button
            type="button"
            onClick={() => {
              const d = new Date(dateFrom + 'T00:00:00');
              d.setMonth(d.getMonth() + 1);
              const from = new Date(d.getFullYear(), d.getMonth(), 1);
              const to = new Date(d.getFullYear(), d.getMonth() + 1, 0);
              setDateFrom(padDate(from));
              setDateTo(padDate(to));
            }}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">From</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
            </div>
            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">To</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <button
              type="button"
              onClick={() => setIncludeTransfers(!includeTransfers)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${includeTransfers ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${includeTransfers ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-[12px] text-gray-500">Include transfers</span>
          </label>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1.5 pb-1">
          {categories.map((c) => (
            <button
              key={c.key}
              onClick={() => setActiveCategory(c.key)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium rounded-lg transition-all whitespace-nowrap ${
                activeCategory === c.key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <span className="text-[13px]">{c.emoji}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total Spent</p>
          </div>
          <p className="text-xl sm:text-2xl font-bold tabular-nums">{currencySymbol}{Math.round(total).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Transactions</p>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 tabular-nums">{filtered.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" /></svg>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Avg / Tx</p>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 tabular-nums">{currencySymbol}{Math.round(avgPerTx).toLocaleString()}</p>
        </div>
      </div>

      {/* Search + Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by category, note, or payment method..."
            className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
          />
        </div>
        <div className="flex gap-0.5 bg-gray-100 p-0.5 rounded-lg">
          {([
            { key: 'list' as const, label: 'List', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg> },
            { key: 'reports' as const, label: 'Reports', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg> },
            { key: 'recurring' as const, label: 'Recurring', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182M21.015 4.356v4.992" /></svg> },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-medium rounded-md transition-all ${
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {Object.keys(grouped).length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">No expenses found</p>
              <p className="text-xs text-gray-400 mt-1">Add your first expense or adjust filters</p>
            </div>
          )}

          {Object.entries(grouped).map(([date, items]) => {
            const dayTotal = items.reduce((s, e) => s + e.amount, 0);
            return (
              <div key={date} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Date Header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
                  <span className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider">{formatDateHeading(date)}</span>
                  <span className="text-[13px] font-bold text-gray-800 tabular-nums">{currencySymbol}{Math.round(dayTotal).toLocaleString()}</span>
                </div>
                {/* Expense Rows */}
                <div className="divide-y divide-gray-100/80">
                  {items.map((expense) => (
                    <div key={expense.id} onClick={() => handleEdit(expense)} className="flex items-center justify-between px-4 py-3 hover:bg-indigo-50/30 transition-colors group cursor-pointer gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl ring-1 flex items-center justify-center shrink-0 ${getCategoryColor(expense.category)}`}>
                          <span className="text-[20px]">{getCategoryEmoji(expense.category)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-gray-800 truncate">{expense.category}</p>
                          {expense.description && <p className="text-[12px] text-gray-400 truncate">{expense.description}</p>}
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            {expense.subCategory && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-sky-50 text-sky-600">{expense.subCategory}</span>
                            )}
                            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-amber-50 text-amber-600">{expense.paymentMethod}</span>
                            {expense.paidBy && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-emerald-50 text-emerald-600">{expense.paidBy}</span>
                            )}
                            {expense.tags && expense.tags.split(',').map(tag => (
                              <span key={tag} className="px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-rose-50 text-rose-500">#{tag.trim()}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="text-[14px] font-bold text-gray-900 tabular-nums shrink-0">{currencySymbol}{expense.amount.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'reports' && (() => {
        const totalDays = Math.max(1, Math.round((new Date(dateTo + 'T00:00:00').getTime() - new Date(dateFrom + 'T00:00:00').getTime()) / 86400000) + 1);
        const dailyAvg = filtered.length > 0 ? total / totalDays : 0;
        const largest = filtered.length > 0 ? filtered.reduce((max, e) => e.amount > max.amount ? e : max, filtered[0]) : null;

        // Group by category, then by subcategory
        const catMap: Record<string, { total: number; emoji: string; subs: Record<string, { total: number; count: number }>, count: number }> = {};
        for (const e of filtered) {
          if (!catMap[e.category]) {
            catMap[e.category] = { total: 0, emoji: getCategoryEmoji(e.category), subs: {}, count: 0 };
          }
          catMap[e.category].total += e.amount;
          catMap[e.category].count += 1;
          const sub = e.subCategory || 'Uncategorized';
          if (!catMap[e.category].subs[sub]) {
            catMap[e.category].subs[sub] = { total: 0, count: 0 };
          }
          catMap[e.category].subs[sub].total += e.amount;
          catMap[e.category].subs[sub].count += 1;
        }
        const sortedCats = Object.entries(catMap).sort((a, b) => b[1].total - a[1].total);

        return (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 mb-1">Total Spent</p>
                <p className="text-xl sm:text-2xl font-bold text-indigo-700 tabular-nums">{currencySymbol}{Math.round(total).toLocaleString()}</p>
                <p className="text-[12px] text-indigo-400 mt-1">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Daily Average</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 tabular-nums">{currencySymbol}{Math.round(dailyAvg).toLocaleString()}</p>
                <p className="text-[12px] text-gray-400 mt-1">over {totalDays} day{totalDays !== 1 ? 's' : ''}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Largest</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 tabular-nums">{currencySymbol}{largest ? Math.round(largest.amount).toLocaleString() : 0}</p>
                <p className="text-[12px] text-gray-400 mt-1">{largest?.category || '—'}</p>
              </div>
            </div>

            {/* Spending by Category */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
                <h3 className="text-[13px] font-semibold text-gray-800 flex items-center gap-1.5">
                  <span>📊</span> Spending by Category
                </h3>
              </div>
              {sortedCats.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm text-gray-400">No expenses in this period</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {sortedCats.map(([cat, data]) => {
                    const pct = total > 0 ? (data.total / total) * 100 : 0;
                    const sortedSubs = Object.entries(data.subs).sort((a, b) => b[1].total - a[1].total);
                    return (
                      <div key={cat} className="px-4 py-3.5">
                        {/* Category Header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{data.emoji}</span>
                            <span className="text-[13px] font-semibold text-gray-800">{cat}</span>
                            <span className="text-[11px] text-gray-400">({data.count})</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[12px] font-medium text-gray-400">{pct.toFixed(1)}%</span>
                            <span className="text-[13px] font-bold text-gray-900 tabular-nums">{currencySymbol}{Math.round(data.total).toLocaleString()}</span>
                          </div>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        {/* Sub-categories */}
                        {sortedSubs.length > 0 && !(sortedSubs.length === 1 && sortedSubs[0][0] === 'Uncategorized') && (
                          <div className="ml-7 mt-1 space-y-1">
                            {sortedSubs.map(([sub, subData]) => (
                              <div key={sub} className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[12px] text-gray-600">{sub}</span>
                                  <span className="text-[11px] text-gray-400">({subData.count})</span>
                                </div>
                                <span className="text-[12px] font-semibold text-gray-700 tabular-nums">{currencySymbol}{Math.round(subData.total).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {activeTab === 'recurring' && (
        <div className="space-y-4">
          {recurringRules.length === 0 && !showRecurringForm ? (
            <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M21.015 4.356v4.992" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700">No recurring expenses</p>
              <p className="text-xs text-gray-400 mt-1">Set up automatic expenses for subscriptions, rent, SIPs, and more</p>
              <button
                onClick={() => setShowRecurringForm(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white text-[13px] font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Add Recurring Expense
              </button>
            </div>
          ) : (
            <>
              {/* Rule list */}
              {recurringRules.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold text-gray-800">Recurring Rules</h3>
                    <button
                      onClick={() => { resetRecurringForm(); setShowRecurringForm(true); }}
                      className="text-[12px] font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      + Add Rule
                    </button>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {recurringRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 cursor-pointer transition-colors gap-3"
                        onClick={() => handleEditRecurring(rule)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl ring-1 flex items-center justify-center shrink-0 ${getCategoryColor(rule.category)}`}>
                            <span className="text-[20px]">{getCategoryEmoji(rule.category)}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-semibold text-gray-800 truncate">{rule.label}</span>
                              {rule.active === false && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full font-medium">Paused</span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-indigo-50 text-indigo-600">{rule.frequency} · Day {rule.dayOfMonth}</span>
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-violet-50 text-violet-600">
                                {getCategoryEmoji(rule.category)} {rule.category}
                              </span>
                              {rule.subCategory && (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-sky-50 text-sky-600">{rule.subCategory}</span>
                              )}
                              {rule.paymentMethod && (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-amber-50 text-amber-600">{rule.paymentMethod}</span>
                              )}
                              {rule.paidBy && (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-emerald-50 text-emerald-600">{rule.paidBy}</span>
                              )}
                              {rule.tags && rule.tags.split(',').map(tag => (
                                <span key={tag} className="px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-rose-50 text-rose-500">#{tag.trim()}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-[13px] font-bold text-gray-900 tabular-nums">{currencySymbol}{Math.round(rule.amount).toLocaleString()}</span>
                          <button
                            onClick={(ev) => { ev.stopPropagation(); handleDeleteRecurring(rule.id); }}
                            className="text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Recurring Expense Modal */}
      {showRecurringForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-start justify-center sm:pt-10 sm:pb-10 sm:px-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={resetRecurringForm} />
          <form
            onSubmit={handleRecurringSubmit}
            className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] sm:max-h-[calc(100vh-5rem)] overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                {editingRecurringId ? 'Edit Recurring Expense' : 'Add Recurring Expense'}
              </h2>
              <button type="button" onClick={resetRecurringForm} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Label */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Label</label>
              <input
                type="text"
                placeholder="e.g. Netflix, Rent, SIP"
                value={recurringForm.label}
                onChange={(e) => setRecurringForm({ ...recurringForm, label: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Amount ({currencySymbol})</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={recurringForm.amount}
                onChange={(e) => setRecurringForm({ ...recurringForm, amount: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>

            {/* Frequency + Day */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Frequency</label>
                <div className="flex flex-wrap gap-1.5">
                  {['Daily', 'Weekly', 'Monthly', 'Yearly'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setRecurringForm({ ...recurringForm, frequency: f })}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                        recurringForm.frequency === f
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Day</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={recurringForm.dayOfMonth}
                  onChange={(e) => setRecurringForm({ ...recurringForm, dayOfMonth: parseInt(e.target.value) || 1 })}
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
                  value={recurringForm.startDate}
                  onChange={(e) => setRecurringForm({ ...recurringForm, startDate: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">End Date (optional)</label>
                <input
                  type="date"
                  value={recurringForm.endDate}
                  onChange={(e) => setRecurringForm({ ...recurringForm, endDate: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Category pills */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Category</label>
              <div className="flex flex-wrap gap-1.5">
                {categories.filter(c => c.key !== 'All').map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setRecurringForm({ ...recurringForm, category: c.key, subCategory: '' })}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                      recurringForm.category === c.key
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span>{c.emoji}</span>
                    <span className="hidden sm:inline">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-category pills */}
            {subCategories[recurringForm.category] && (
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Sub-category</label>
                <div className="flex flex-wrap gap-1.5">
                  {subCategories[recurringForm.category].map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setRecurringForm({ ...recurringForm, subCategory: recurringForm.subCategory === sub ? '' : sub })}
                      className={`px-2.5 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                        recurringForm.subCategory === sub
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Payment Method</label>
              <div className="flex flex-wrap gap-1.5">
                {['Cash', 'UPI', 'Debit Card', 'Credit Card', 'Bank Transfer', 'Zaggle/Pluxee', 'Other'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setRecurringForm({ ...recurringForm, paymentMethod: m })}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                      recurringForm.paymentMethod === m
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Paid by */}
            {members.length > 0 && (
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Paid by</label>
                <div className="flex flex-wrap gap-1.5">
                  {members.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setRecurringForm({ ...recurringForm, paidBy: recurringForm.paidBy === m.name ? '' : m.name })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                        recurringForm.paidBy === m.name
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {m.picture ? (
                        <img src={m.picture} alt="" className="w-4 h-4 rounded-full" />
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[9px] font-bold">
                          {m.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Note */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Note (optional)</label>
              <input
                type="text"
                placeholder="e.g. Netflix monthly subscription"
                value={recurringForm.description}
                onChange={(e) => setRecurringForm({ ...recurringForm, description: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Tags (optional, max 8)</label>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {rTags.map((t, i) => (
                  <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[11px] font-medium flex items-center gap-1">
                    {t}
                    <button type="button" onClick={() => setRTags(rTags.filter((_, j) => j !== i))} className="hover:text-indigo-900">&times;</button>
                  </span>
                ))}
              </div>
              {rTags.length < 8 && (
                <input
                  type="text"
                  placeholder="e.g. subscription, monthly"
                  value={rTagInput}
                  onChange={(e) => setRTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ',') && rTagInput.trim()) {
                      e.preventDefault();
                      const tag = rTagInput.trim().toLowerCase();
                      if (!rTags.includes(tag)) setRTags([...rTags, tag]);
                      setRTagInput('');
                    }
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              )}
              {rTags.length < 8 && allTags.filter(t => !rTags.includes(t)).length > 0 && (
                <div className="mt-2">
                  <p className="text-[11px] text-gray-400 mb-1">Suggestions</p>
                  <div className="flex flex-wrap gap-1">
                    {allTags.filter(t => !rTags.includes(t)).map(t => (
                      <button key={t} type="button" onClick={() => { if (rTags.length < 8) setRTags([...rTags, t]); }} className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mark as Transfer */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-[13px] font-medium text-gray-700">Mark as Transfer</p>
                <p className="text-[11px] text-gray-400">Mark as a fund transfer or payment</p>
              </div>
              <button
                type="button"
                onClick={() => setRMarkAsTransfer(!rMarkAsTransfer)}
                className={`w-10 h-6 rounded-full transition-colors ${rMarkAsTransfer ? 'bg-indigo-600' : 'bg-gray-300'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transform transition-transform mx-1 ${rMarkAsTransfer ? 'translate-x-4' : ''}`} />
              </button>
            </div>

            {/* Reward Eligibility */}
            <div>
              <label className="block text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Reward Eligibility</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: 'full', label: 'Earn Full Rewards (Base + Bonus)' },
                  { key: 'base', label: 'Base Rewards Only' },
                  { key: 'none', label: 'No Rewards' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setRRewardEligibility(opt.key)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                      rRewardEligibility === opt.key
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-[13px] font-medium text-gray-700">Active</p>
                <p className="text-[11px] text-gray-400">Automatically create expenses on schedule</p>
              </div>
              <button
                type="button"
                onClick={() => setRActive(!rActive)}
                className={`w-10 h-6 rounded-full transition-colors ${rActive ? 'bg-indigo-600' : 'bg-gray-300'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transform transition-transform mx-1 ${rActive ? 'translate-x-4' : ''}`} />
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-2">
                {editingRecurringId && (
                  <button
                    type="button"
                    onClick={() => { handleDeleteRecurring(editingRecurringId); resetRecurringForm(); }}
                    className="px-4 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={resetRecurringForm}
                  className="px-4 py-2 text-[13px] font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white text-[13px] font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {editingRecurringId ? 'Save' : 'Add Rule'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
