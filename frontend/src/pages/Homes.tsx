import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHome } from '../context/HomeContext';
import api from '../services/api';

export default function Homes() {
  const navigate = useNavigate();
  const { homes, loadHomes } = useHome();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
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
      navigate(`/homes/${res.data.home.id}`);
      setShowCreate(false);
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
      navigate(`/homes/${res.data.home.id}`);
      setShowJoin(false);
      setInviteCode('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to join home');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">My Homes</h2>
          <p className="text-sm text-gray-500 mt-1">Create or join a home to manage finances together</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowCreate(true); setShowJoin(false); setError(''); }}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
          >
            + Create Home
          </button>
          <button
            onClick={() => { setShowJoin(true); setShowCreate(false); setError(''); }}
            className="px-4 py-2 bg-white border border-indigo-600 text-indigo-600 text-sm font-medium rounded-lg hover:bg-indigo-50 transition"
          >
            Join Home
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Create a New Home</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newHomeName}
              onChange={(e) => setNewHomeName(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="e.g., My Family, Roommates..."
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <button
              onClick={handleCreate}
              disabled={loading || !newHomeName.trim()}
              className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      )}

      {/* Join Form */}
      {showJoin && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Join an Existing Home</h3>
          <p className="text-sm text-gray-500 mb-3">Enter the 8-character invite code shared by a home member</p>
          <div className="flex gap-3">
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono text-lg tracking-widest uppercase"
              placeholder="ABCD1234"
              maxLength={8}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
            <button
              onClick={handleJoin}
              disabled={loading || inviteCode.length < 8}
              className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Join'}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      )}

      {/* Homes List */}
      {homes.length === 0 && !showCreate && !showJoin ? (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-50 mb-4">
            <span className="text-4xl">🏠</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No homes yet</h3>
          <p className="text-gray-500 mb-6">Create a home to start managing your finances, or join an existing one.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition"
            >
              Create Your First Home
            </button>
            <button
              onClick={() => setShowJoin(true)}
              className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
            >
              Join with Invite Code
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {homes.map((membership) => (
            <div
              key={membership.id}
              onClick={() => navigate(`/homes/${membership.home.id}`)}
              className="p-6 bg-white rounded-xl shadow-sm border-2 cursor-pointer transition-all hover:shadow-md border-gray-100 hover:border-indigo-300"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{membership.home.name}</h3>
                  <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full mt-1 ${
                    membership.role === 'OWNER'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {membership.role}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400">Invite Code:</span>
                <code className="text-xs font-mono bg-gray-50 px-2 py-1 rounded text-gray-600">
                  {membership.home.inviteCode}
                </code>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
