import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import { useHome } from '../context/HomeContext';
import type { Insurance } from '../types';

const statusStyles: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  EXPIRED: 'bg-gray-100 text-gray-500',
  CANCELLED: 'bg-red-50 text-red-600',
};

export default function InsurancePage() {
  const { homeId } = useParams<{ homeId: string }>();
  const { currencySymbol } = useHome();
  const [policies, setPolicies] = useState<Insurance[]>([]);

  useEffect(() => {
    api.get('/insurance').then((res) => setPolicies(res.data));
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
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Insurance Policies</h1>
          {policies.length > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">{policies.length} {policies.length === 1 ? 'policy' : 'policies'}</p>
          )}
        </div>
        <button className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white text-[13px] font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Policy
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {policies.map((policy) => (
          <div key={policy.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-md transition-all duration-200">
            <div className="flex justify-between items-center mb-3">
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${statusStyles[policy.status] || 'bg-gray-100 text-gray-500'}`}>
                {policy.status}
              </span>
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{policy.type}</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{policy.provider}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Policy #</span>
                <span className="font-mono text-xs text-gray-700">{policy.policyNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Premium</span>
                <span className="font-semibold text-gray-800">{currencySymbol}{policy.premium}/mo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Coverage</span>
                <span className="font-semibold text-gray-800">{currencySymbol}{policy.coverageAmount.toLocaleString()}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-[11px] text-gray-400">{policy.startDate} &rarr; {policy.endDate}</p>
            </div>
          </div>
        ))}
      </div>
      {policies.length === 0 && (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">No insurance policies added yet</p>
          <p className="text-xs text-gray-400 mt-1">Add your first policy to start tracking</p>
        </div>
      )}
    </div>
  );
}
