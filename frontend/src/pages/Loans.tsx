import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import { useHome } from '../context/HomeContext';
import type { Loan } from '../types';

const statusStyles: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  CLOSED: 'bg-gray-100 text-gray-500',
  DEFAULTED: 'bg-red-50 text-red-600',
};

export default function Loans() {
  const { homeId } = useParams<{ homeId: string }>();
  const { currencySymbol } = useHome();
  const [loans, setLoans] = useState<Loan[]>([]);

  useEffect(() => {
    api.get('/loans').then((res) => setLoans(res.data));
  }, []);

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
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Loans</h1>
          {loans.length > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">{loans.length} {loans.length === 1 ? 'loan' : 'loans'} tracked</p>
          )}
        </div>
        <button className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white text-[13px] font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Loan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {loans.map((loan) => (
          <div key={loan.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-md transition-all duration-200">
            <div className="flex justify-between items-center mb-3">
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${statusStyles[loan.status] || 'bg-gray-100 text-gray-500'}`}>
                {loan.status}
              </span>
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{loan.type}</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{loan.lender}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Principal</span>
                <span className="font-semibold text-gray-800">{currencySymbol}{loan.principalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Interest</span>
                <span className="font-semibold text-gray-800">{loan.interestRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">EMI</span>
                <span className="font-semibold text-indigo-600">{currencySymbol}{loan.emiAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <span className="text-gray-500">Outstanding</span>
                <span className="font-bold text-gray-900">${loan.outstandingBalance.toLocaleString()}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-[11px] text-gray-400">{loan.startDate} &rarr; {loan.endDate}</p>
            </div>
          </div>
        ))}
      </div>
      {loans.length === 0 && (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">No loans tracked yet</p>
          <p className="text-xs text-gray-400 mt-1">Add your first loan to start tracking EMIs</p>
        </div>
      )}
    </div>
  );
}
