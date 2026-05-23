import { useEffect, useState } from 'react';
import api from '../services/api';
import type { Loan } from '../types';

export default function Loans() {
  const [loans, setLoans] = useState<Loan[]>([]);

  useEffect(() => {
    api.get('/loans').then((res) => setLoans(res.data));
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Loans</h2>
        <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition">
          + Add Loan
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loans.map((loan) => (
          <div key={loan.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition">
            <div className="flex justify-between items-center mb-3">
              <span className={`status ${loan.status.toLowerCase()}`}>
                {loan.status}
              </span>
              <span className="text-xs font-medium text-gray-400 uppercase">{loan.type}</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">{loan.lender}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Principal</span>
                <span className="font-semibold text-gray-800">${loan.principalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Interest Rate</span>
                <span className="font-semibold text-gray-800">{loan.interestRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">EMI</span>
                <span className="font-semibold text-indigo-600">${loan.emiAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <span className="text-gray-500">Outstanding</span>
                <span className="font-bold text-gray-900">${loan.outstandingBalance.toLocaleString()}</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">{loan.startDate} → {loan.endDate}</p>
            </div>
          </div>
        ))}
      </div>
      {loans.length === 0 && (
        <div className="text-center py-12 text-gray-400">No loans tracked yet.</div>
      )}
    </div>
  );
}
