import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Welcome back, {user?.name}!</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/expenses" className="block p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition">
          <h3 className="text-lg font-semibold text-indigo-600 mb-2">Expenses</h3>
          <p className="text-sm text-gray-500">Track and manage all your expenses</p>
        </Link>
        <Link to="/cards" className="block p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition">
          <h3 className="text-lg font-semibold text-indigo-600 mb-2">Cards</h3>
          <p className="text-sm text-gray-500">Manage debit/credit cards and their perks</p>
        </Link>
        <Link to="/insurance" className="block p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition">
          <h3 className="text-lg font-semibold text-indigo-600 mb-2">Insurance</h3>
          <p className="text-sm text-gray-500">View and manage insurance policies</p>
        </Link>
        <Link to="/loans" className="block p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition">
          <h3 className="text-lg font-semibold text-indigo-600 mb-2">Loans</h3>
          <p className="text-sm text-gray-500">Track loans and EMI payments</p>
        </Link>
      </div>
    </div>
  );
}
