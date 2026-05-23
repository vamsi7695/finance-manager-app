import { useEffect, useState } from 'react';
import api from '../services/api';
import type { Insurance } from '../types';

export default function InsurancePage() {
  const [policies, setPolicies] = useState<Insurance[]>([]);

  useEffect(() => {
    api.get('/insurance').then((res) => setPolicies(res.data));
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Insurance Policies</h2>
        <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition">
          + Add Policy
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {policies.map((policy) => (
          <div key={policy.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition">
            <div className="flex justify-between items-center mb-3">
              <span className={`status ${policy.status.toLowerCase()}`}>
                {policy.status}
              </span>
              <span className="text-xs font-medium text-gray-400 uppercase">{policy.type}</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{policy.provider}</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p>Policy #: <span className="font-mono">{policy.policyNumber}</span></p>
              <p>Premium: <span className="font-semibold text-gray-800">${policy.premium}/month</span></p>
              <p>Coverage: <span className="font-semibold text-gray-800">${policy.coverageAmount.toLocaleString()}</span></p>
              <p className="text-xs text-gray-400 mt-2">{policy.startDate} → {policy.endDate}</p>
            </div>
          </div>
        ))}
      </div>
      {policies.length === 0 && (
        <div className="text-center py-12 text-gray-400">No insurance policies added yet.</div>
      )}
    </div>
  );
}
