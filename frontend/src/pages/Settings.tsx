import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHome } from '../context/HomeContext';
import api from '../services/api';

export default function Settings() {
  const { homes, setCurrentHome, loadHomes } = useHome();
  const [newHomeName, setNewHomeName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!newHomeName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/homes', { name: newHomeName });
      await loadHomes();
      setCurrentHome(res.data.home);
      setNewHomeName('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create home');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/homes/join', { inviteCode: inviteCode.toUpperCase() });
      await loadHomes();
      setCurrentHome(res.data.home);
      setInviteCode('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to join home');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 text-[13px] text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </Link>
      </div>

      <h1 className="text-xl font-semibold text-gray-900 tracking-tight mb-6">Create or Join a Home</h1>

      {/* Create / Join Home */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-[13px] font-semibold text-gray-800">Add a Home</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Create */}
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-gray-700">Create New Home</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newHomeName}
                  onChange={(e) => setNewHomeName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm placeholder:text-gray-400"
                  placeholder="e.g., My Family, Roommates..."
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
                <button
                  onClick={handleCreate}
                  disabled={loading || !newHomeName.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white text-[13px] font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Create
                </button>
              </div>
            </div>
            {/* Join */}
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-gray-700">Join with Invite Code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-mono tracking-widest uppercase placeholder:tracking-normal placeholder:font-sans placeholder:text-gray-400"
                  placeholder="ABCD1234"
                  maxLength={8}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                />
                <button
                  onClick={handleJoin}
                  disabled={loading || inviteCode.length < 8}
                  className="px-4 py-2 bg-indigo-600 text-white text-[13px] font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
          {error && (
            <div className="mt-3 px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Your Homes */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-gray-800">Your Homes</h2>
          <span className="text-[11px] text-gray-400">{homes.length} {homes.length === 1 ? 'home' : 'homes'}</span>
        </div>
        {homes.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">No homes yet</p>
            <p className="text-xs text-gray-400 mt-1">Create or join a home above</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {homes.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <svg className="w-4.5 h-4.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{m.home.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        m.role === 'OWNER' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                      }`}>{m.role}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[11px] text-gray-400">Invite Code</p>
                    <code className="text-[12px] font-mono text-gray-600">{m.home.inviteCode}</code>
                  </div>
                  <Link
                    to="/dashboard"
                    onClick={() => setCurrentHome(m.home)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
