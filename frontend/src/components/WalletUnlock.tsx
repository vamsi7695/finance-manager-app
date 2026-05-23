import { useState } from 'react';
import api from '../services/api';

interface WalletUnlockProps {
  onUnlock: (key: string) => void;
}

export default function WalletUnlock({ onUnlock }: WalletUnlockProps) {
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUnlock = async () => {
    if (!passphrase) {
      setError('Please enter your passphrase');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/security/unlock', { passphrase });
      if (response.data.unlocked) {
        localStorage.setItem('walletKey', passphrase);
        onUnlock(passphrase);
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Invalid passphrase. Please try again.');
      } else {
        setError(err.response?.data?.error || 'Unlock failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleUnlock();
  };

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-50 mb-4">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Wallet Locked</h2>
          <p className="text-sm text-gray-500 mb-6">Enter your passphrase to view and manage your cards</p>

          <div className="space-y-3">
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              placeholder="Enter your passphrase..."
              autoFocus
            />

            {error && (
              <div className="px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleUnlock}
              disabled={loading || !passphrase}
              className="w-full py-2.5 bg-indigo-600 text-white text-[13px] font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Unlock Wallet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
