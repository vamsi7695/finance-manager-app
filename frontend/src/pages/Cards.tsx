import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import type { Card } from '../types';
import WalletSecuritySetup from './WalletSecuritySetup';
import WalletUnlock from '../components/WalletUnlock';

type SecurityStatus = {
  encryptionMethod: string;
  isSetup: boolean;
};

export default function Cards() {
  const { homeId } = useParams<{ homeId: string }>();
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
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

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Cards & Perks</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${securityStatus.encryptionMethod === 'PASSPHRASE' ? 'bg-purple-500' : 'bg-emerald-500'}`}></span>
            <span className="text-xs text-gray-400">
              {securityStatus.encryptionMethod === 'PASSPHRASE' ? 'Passphrase encrypted' : 'Auto-encrypted'}
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium rounded-lg transition-colors ${
            showAddForm
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {showAddForm ? (
            'Cancel'
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Card
            </>
          )}
        </button>
      </div>

      {/* Add Card Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h3 className="text-[13px] font-semibold text-gray-800 mb-4">Add New Card</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-700">Card Number</label>
              <input
                type="text"
                value={newCard.cardNumber}
                onChange={(e) => setNewCard({ ...newCard, cardNumber: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                placeholder="1234 5678 9012 3456"
                maxLength={19}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-700">Card Type</label>
              <select
                value={newCard.cardType}
                onChange={(e) => setNewCard({ ...newCard, cardType: e.target.value as 'CREDIT' | 'DEBIT' })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
              >
                <option value="CREDIT">Credit</option>
                <option value="DEBIT">Debit</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-700">Bank Name</label>
              <input
                type="text"
                value={newCard.bankName}
                onChange={(e) => setNewCard({ ...newCard, bankName: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                placeholder="HDFC Bank"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-700">Expiry Date</label>
              <input
                type="text"
                value={newCard.expiryDate}
                onChange={(e) => setNewCard({ ...newCard, expiryDate: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                placeholder="MM/YY"
                maxLength={5}
              />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[13px] font-medium text-gray-700">Card Holder Name</label>
              <input
                type="text"
                value={newCard.cardHolderName}
                onChange={(e) => setNewCard({ ...newCard, cardHolderName: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                placeholder="JOHN DOE"
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={handleAddCard}
              disabled={!newCard.cardNumber || !newCard.bankName || !newCard.expiryDate || !newCard.cardHolderName}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-[13px] font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Save Card (Encrypted)
            </button>
          </div>
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((card) => (
          <div key={card.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-md transition-all duration-200 relative group">
            <button
              onClick={() => handleDeleteCard(card.id)}
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50"
            >
              <svg className="w-4 h-4 text-red-400 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
            <div className="flex justify-between items-center mb-4">
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                card.cardType === 'CREDIT' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                {card.cardType}
              </span>
              <span className="text-xs font-medium text-gray-400">{card.bankName}</span>
            </div>
            <p className="text-base font-mono tracking-wider text-gray-800 mb-3">
              &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; {card.lastFourDigits || card.cardNumber.slice(-4)}
            </p>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm font-medium text-gray-800">{card.cardHolderName}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Expires {card.expiryDate}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-medium">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Encrypted
              </span>
            </div>
            {card.perks && card.perks.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Perks</h4>
                <ul className="space-y-0.5">
                  {card.perks.map((perk) => (
                    <li key={perk.id} className="text-xs text-gray-500">&bull; {perk.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
      {cards.length === 0 && !showAddForm && (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">No cards added yet</p>
          <p className="text-xs text-gray-400 mt-1">Your cards will be stored with end-to-end encryption</p>
        </div>
      )}
    </div>
  );
}
