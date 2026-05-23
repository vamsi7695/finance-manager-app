import { useState } from 'react';
import api from '../services/api';

interface WalletSecuritySetupProps {
  onComplete: (method: string) => void;
}

export default function WalletSecuritySetup({ onComplete }: WalletSecuritySetupProps) {
  const [selectedMethod, setSelectedMethod] = useState<'PASSPHRASE' | 'AUTO' | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    setError('');

    if (!selectedMethod) {
      setError('Please select an encryption method');
      return;
    }

    if (selectedMethod === 'PASSPHRASE') {
      if (passphrase.length < 8) {
        setError('Passphrase must be at least 8 characters');
        return;
      }
      if (passphrase !== confirmPassphrase) {
        setError('Passphrases do not match');
        return;
      }
    }

    setLoading(true);
    try {
      const payload: Record<string, string> = { method: selectedMethod };
      if (selectedMethod === 'PASSPHRASE') {
        payload.passphrase = passphrase;
      }

      await api.post('/security/setup', payload);

      if (selectedMethod === 'PASSPHRASE') {
        localStorage.setItem('walletKey', passphrase);
      }

      onComplete(selectedMethod);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20 mb-4">
            <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Setup Wallet Security</h1>
          <p className="text-gray-400">Choose how to encrypt your card data</p>
        </div>

        {/* Warning */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-8">
          <p className="text-amber-300 text-sm text-center">
            ⚠️ This choice cannot be changed later. All card data will be encrypted with the selected method. Choose carefully.
          </p>
        </div>

        {/* Options */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {/* Passphrase Option */}
          <button
            onClick={() => setSelectedMethod('PASSPHRASE')}
            className={`relative p-6 rounded-xl border-2 text-left transition-all duration-200 ${
              selectedMethod === 'PASSPHRASE'
                ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            {selectedMethod === 'PASSPHRASE' && (
              <div className="absolute top-3 right-3 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            <div className="text-2xl mb-3">🔒</div>
            <h3 className="text-lg font-semibold text-white mb-2">Passphrase Protected</h3>
            <p className="text-sm text-gray-400 mb-3">Most secure — requires passphrase to decrypt</p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• Choose a passphrase you'll remember</li>
              <li>• Required every time you view card details</li>
              <li className="text-amber-400">• ⚠️ If you forget, data cannot be recovered</li>
            </ul>
          </button>

          {/* Auto Option */}
          <button
            onClick={() => setSelectedMethod('AUTO')}
            className={`relative p-6 rounded-xl border-2 text-left transition-all duration-200 ${
              selectedMethod === 'AUTO'
                ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/20'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            {selectedMethod === 'AUTO' && (
              <div className="absolute top-3 right-3 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            <div className="text-2xl mb-3">🔐</div>
            <h3 className="text-lg font-semibold text-white mb-2">Auto-encrypted</h3>
            <p className="text-sm text-gray-400 mb-3">Simpler — no passphrase needed, data still encrypted</p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• Data encrypted at rest in database</li>
              <li>• No passphrase to remember</li>
              <li>• No risk of lockout</li>
              <li className="text-gray-400">• Less secure than passphrase option</li>
            </ul>
          </button>
        </div>

        {/* Passphrase Input */}
        {selectedMethod === 'PASSPHRASE' && (
          <div className="bg-gray-800/50 rounded-xl p-6 mb-6 border border-gray-700">
            <h4 className="text-white font-medium mb-4">Set Your Passphrase</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Passphrase (min 8 characters)</label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  placeholder="Enter a strong passphrase..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Confirm Passphrase</label>
                <input
                  type="password"
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  placeholder="Confirm your passphrase..."
                />
              </div>
              {passphrase && passphrase.length < 8 && (
                <p className="text-amber-400 text-xs">Passphrase must be at least 8 characters</p>
              )}
              {confirmPassphrase && passphrase !== confirmPassphrase && (
                <p className="text-red-400 text-xs">Passphrases do not match</p>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSetup}
          disabled={!selectedMethod || loading}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 ${
            selectedMethod
              ? selectedMethod === 'PASSPHRASE'
                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/30'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/30'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Setting up encryption...
            </span>
          ) : (
            `Enable ${selectedMethod === 'PASSPHRASE' ? 'Passphrase' : selectedMethod === 'AUTO' ? 'Auto' : ''} Encryption`
          )}
        </button>
      </div>
    </div>
  );
}
