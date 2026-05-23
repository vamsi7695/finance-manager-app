import { useEffect, useState } from 'react';
import api from '../services/api';
import type { Card } from '../types';
import WalletSecuritySetup from './WalletSecuritySetup';
import WalletUnlock from '../components/WalletUnlock';

type SecurityStatus = {
  encryptionMethod: string;
  isSetup: boolean;
};

export default function Cards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [walletUnlocked, setWalletUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCard, setNewCard] = useState({
    cardNumber: '',
    cardType: 'CREDIT' as 'CREDIT' | 'DEBIT',
    bankName: '',
    expiryDate: '',
    cardHolderName: '',
  });

  useEffect(() => {
    checkSecurityStatus();
  }, []);

  const checkSecurityStatus = async () => {
    try {
      const res = await api.get('/security/status');
      setSecurityStatus(res.data);

      if (res.data.isSetup) {
        if (res.data.encryptionMethod === 'AUTO') {
          setWalletUnlocked(true);
          loadCards();
        } else if (res.data.encryptionMethod === 'PASSPHRASE') {
          const storedKey = localStorage.getItem('walletKey');
          if (storedKey) {
            setWalletUnlocked(true);
            loadCards(storedKey);
          }
        }
      }
    } catch {
      // If security endpoint fails, just show setup
    } finally {
      setLoading(false);
    }
  };

  const loadCards = async (key?: string) => {
    try {
      const headers: Record<string, string> = {};
      if (key) {
        headers['X-Encryption-Key'] = key;
      }
      const res = await api.get('/cards', { headers });
      setCards(res.data);
    } catch {
      setCards([]);
    }
  };

  const handleSecuritySetup = (method: string) => {
    setSecurityStatus({ encryptionMethod: method, isSetup: true });
    if (method === 'AUTO') {
      setWalletUnlocked(true);
      loadCards();
    } else {
      setWalletUnlocked(true);
      loadCards(localStorage.getItem('walletKey') || undefined);
    }
  };

  const handleUnlock = (key: string) => {
    setWalletUnlocked(true);
    loadCards(key);
  };

  const handleAddCard = async () => {
    try {
      const headers: Record<string, string> = {};
      const walletKey = localStorage.getItem('walletKey');
      if (walletKey) {
        headers['X-Encryption-Key'] = walletKey;
      }
      const res = await api.post('/cards', { ...newCard, perks: [] }, { headers });
      setCards([...cards, res.data]);
      setShowAddForm(false);
      setNewCard({ cardNumber: '', cardType: 'CREDIT', bankName: '', expiryDate: '', cardHolderName: '' });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add card');
    }
  };

  const handleDeleteCard = async (id: string) => {
    try {
      await api.delete(`/cards/${id}`);
      setCards(cards.filter(c => c.id !== id));
    } catch {
      alert('Failed to delete card');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Show security setup if not configured
  if (!securityStatus?.isSetup) {
    return <WalletSecuritySetup onComplete={handleSecuritySetup} />;
  }

  // Show unlock if passphrase mode and not unlocked
  if (securityStatus.encryptionMethod === 'PASSPHRASE' && !walletUnlocked) {
    return <WalletUnlock onUnlock={handleUnlock} />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Cards & Perks</h2>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
            <span className={`inline-block w-2 h-2 rounded-full ${securityStatus.encryptionMethod === 'PASSPHRASE' ? 'bg-purple-500' : 'bg-emerald-500'}`}></span>
            {securityStatus.encryptionMethod === 'PASSPHRASE' ? 'Passphrase encrypted' : 'Auto-encrypted'}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
        >
          {showAddForm ? 'Cancel' : '+ Add Card'}
        </button>
      </div>

      {/* Add Card Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Card</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Card Number</label>
              <input
                type="text"
                value={newCard.cardNumber}
                onChange={(e) => setNewCard({ ...newCard, cardNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="1234 5678 9012 3456"
                maxLength={19}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Card Type</label>
              <select
                value={newCard.cardType}
                onChange={(e) => setNewCard({ ...newCard, cardType: e.target.value as 'CREDIT' | 'DEBIT' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="CREDIT">Credit</option>
                <option value="DEBIT">Debit</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Bank Name</label>
              <input
                type="text"
                value={newCard.bankName}
                onChange={(e) => setNewCard({ ...newCard, bankName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="HDFC Bank"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Expiry Date</label>
              <input
                type="text"
                value={newCard.expiryDate}
                onChange={(e) => setNewCard({ ...newCard, expiryDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="MM/YY"
                maxLength={5}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">Card Holder Name</label>
              <input
                type="text"
                value={newCard.cardHolderName}
                onChange={(e) => setNewCard({ ...newCard, cardHolderName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="JOHN DOE"
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={handleAddCard}
              disabled={!newCard.cardNumber || !newCard.bankName || !newCard.expiryDate || !newCard.cardHolderName}
              className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Card (Encrypted)
            </button>
          </div>
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div key={card.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition relative group">
            <button
              onClick={() => handleDeleteCard(card.id)}
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition p-1 rounded-full hover:bg-red-50"
            >
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <div className="flex justify-between items-center mb-4">
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                card.cardType === 'CREDIT' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
              }`}>
                {card.cardType}
              </span>
              <span className="text-sm font-medium text-gray-500">{card.bankName}</span>
            </div>
            <p className="text-lg font-mono tracking-wider text-gray-800 mb-2">
              •••• •••• •••• {card.lastFourDigits || card.cardNumber.slice(-4)}
            </p>
            <p className="text-sm font-medium text-gray-700">{card.cardHolderName}</p>
            <p className="text-xs text-gray-400 mt-1">Expires: {card.expiryDate}</p>
            {card.perks && card.perks.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Perks</h4>
                <ul className="space-y-1">
                  {card.perks.map((perk) => (
                    <li key={perk.id} className="text-sm text-gray-600">• {perk.name}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-gray-50">
              <span className="inline-flex items-center gap-1 text-xs text-green-600">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Encrypted
              </span>
            </div>
          </div>
        ))}
      </div>
      {cards.length === 0 && !showAddForm && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <p className="text-gray-500 mb-2">No cards added yet</p>
          <p className="text-gray-400 text-sm">Your cards will be stored with end-to-end encryption</p>
        </div>
      )}
    </div>
  );
}
