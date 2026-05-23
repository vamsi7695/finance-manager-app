import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useHome } from '../context/HomeContext';
import api from '../services/api';

interface Member {
  id: string;
  role: string;
  joinedAt: string;
  user: { id: string; name: string; email: string; picture: string };
}

const currencies = [
  { code: 'INR', symbol: '\u20B9', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '\u20AC', name: 'Euro' },
  { code: 'GBP', symbol: '\u00A3', name: 'British Pound' },
  { code: 'JPY', symbol: '\u00A5', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
];

export default function HomeSettings() {
  const { homeId } = useParams<{ homeId: string }>();
  const { user } = useAuth();
  const { loadHomes } = useHome();
  const navigate = useNavigate();

  const [homeName, setHomeName] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [guestLink, setGuestLink] = useState('');
  const [guestLinkCopied, setGuestLinkCopied] = useState(false);

  useEffect(() => {
    if (homeId) {
      api.get(`/homes/${homeId}`).then((res) => {
        setHomeName(res.data.name);
        setCurrency(res.data.currency || 'INR');
        setInviteCode(res.data.inviteCode);
        setIsOwner(res.data.createdBy === user?.id);
      }).catch(() => {});

      api.get(`/homes/${homeId}/members`).then((res) => {
        setMembers(res.data);
      }).catch(() => {});
    }
  }, [homeId]);

  const handleSave = async (field: string, value: string) => {
    setSaving(field);
    try {
      await api.put(`/homes/${homeId}`, { [field]: value });
      await loadHomes();
      setSaved(field);
      setTimeout(() => setSaved(null), 2000);
    } catch {
      // ignore
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/homes/${homeId}`);
      await loadHomes();
      navigate('/dashboard');
    } catch {
      setDeleteLoading(false);
    }
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currencyInfo = currencies.find(c => c.code === currency);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          to={`/homes/${homeId}`}
          className="inline-flex items-center gap-1 text-[13px] text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>
      </div>

      <h1 className="text-xl font-semibold text-gray-900 tracking-tight mb-6">Home Settings</h1>

      <div className="space-y-4">
        {/* Home Name */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <label className="text-[13px] font-medium text-gray-700">Home Name</label>
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <input
              type="text"
              value={homeName}
              onChange={(e) => setHomeName(e.target.value)}
              disabled={!isOwner}
              className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm disabled:bg-gray-50 disabled:text-gray-500"
            />
            {isOwner && (
              <button
                onClick={() => handleSave('name', homeName)}
                disabled={saving === 'name'}
                className="px-4 py-2 bg-indigo-600 text-white text-[13px] font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40"
              >
                {saving === 'name' ? 'Saving...' : saved === 'name' ? 'Saved!' : 'Save'}
              </button>
            )}
          </div>
        </div>

        {/* Home Currency */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <label className="text-[13px] font-medium text-gray-700">Home Currency</label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mt-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg w-fit">
              <span className="text-lg font-medium text-gray-700">{currencyInfo?.symbol}</span>
            </div>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              disabled={!isOwner}
              className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm disabled:bg-gray-50 disabled:text-gray-500"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} &mdash; {c.name}
                </option>
              ))}
            </select>
            {isOwner && (
              <button
                onClick={() => handleSave('currency', currency)}
                disabled={saving === 'currency'}
                className="px-4 py-2 bg-indigo-600 text-white text-[13px] font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40 w-full sm:w-auto"
              >
                {saving === 'currency' ? 'Saving...' : saved === 'currency' ? 'Saved!' : 'Save'}
              </button>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-2">All currency amounts across the app will use this symbol.</p>
        </div>

        {/* Haptic Feedback */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[13px] font-medium text-gray-700">Haptic Feedback</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">Vibrate on button presses and interactions</p>
            </div>
            <button
              onClick={() => setHapticFeedback(!hapticFeedback)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${hapticFeedback ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${hapticFeedback ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Members */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-gray-800">Members ({members.length})</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between px-3 sm:px-5 py-3.5">
                <div className="flex items-center gap-3">
                  {member.user?.picture ? (
                    <img
                      src={member.user.picture}
                      alt={member.user.name}
                      className="w-9 h-9 rounded-full ring-2 ring-gray-100"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                      <span className="text-xs font-semibold text-white">{(member.user?.name || '?').charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {member.user?.name || 'Unknown'}
                      {member.user?.id === user?.id && <span className="text-gray-400 ml-1">(You)</span>}
                    </p>
                    <p className="text-xs text-gray-400">{member.user?.email}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                  member.role === 'OWNER' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                }`}>{member.role.toLowerCase()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Invite Members */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-[13px] font-semibold text-gray-800 mb-1">Invite Members</h2>
          <p className="text-[11px] text-gray-400 mb-3">Share this code with people you want to join this home.</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg">
              <code className="text-sm font-mono font-semibold text-gray-700 tracking-widest">{inviteCode}</code>
            </div>
            <button
              onClick={handleCopyInvite}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white text-[13px] font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        {/* Guest (Read Only) Link */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-[13px] font-semibold text-gray-800 mb-1">Guest Access (Read Only)</h2>
          <p className="text-[11px] text-gray-400 mb-3">Generate a link that allows view-only access to this home. Guests cannot edit any data.</p>
          {guestLink ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                <p className="text-[12px] font-mono text-gray-500 truncate">{guestLink}</p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(guestLink);
                  setGuestLinkCopied(true);
                  setTimeout(() => setGuestLinkCopied(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white text-[13px] font-medium rounded-lg hover:bg-indigo-700 transition-colors shrink-0"
              >
                {guestLinkCopied ? (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
              <button
                onClick={() => setGuestLink('')}
                className="p-2.5 text-gray-400 hover:text-red-500 border border-gray-200 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                title="Revoke guest link"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setGuestLink(`${window.location.origin}/homes/${homeId}/guest/${crypto.randomUUID().slice(0, 8)}`)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.02a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.343 8.21" />
              </svg>
              Generate Guest Link
            </button>
          )}
        </div>

        {/* Push Notifications */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[13px] font-medium text-gray-700">Push Notifications</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">Get notified when members add expenses or make changes</p>
            </div>
            <button
              onClick={() => setPushNotifications(!pushNotifications)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${pushNotifications ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${pushNotifications ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        {isOwner && (
          <div className="bg-white rounded-xl border border-red-200 p-5">
            <h2 className="text-[13px] font-semibold text-red-600 mb-1">Danger Zone</h2>
            <p className="text-[11px] text-gray-500 mb-4">Permanently delete this home and all its data. This action cannot be undone.</p>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Delete Home
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm text-red-600 font-medium">Are you sure?</p>
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="px-4 py-2 bg-red-600 text-white text-[13px] font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-40"
                >
                  {deleteLoading ? 'Deleting...' : 'Yes, Delete'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-[13px] font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
