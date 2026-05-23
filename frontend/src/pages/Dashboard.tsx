import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useHome } from '../context/HomeContext';

const appSections = [
  { path: 'expenses', label: 'Expenses', desc: 'Track spending', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
  ), color: 'bg-emerald-500' },
  { path: 'cards', label: 'Cards', desc: 'Manage cards & perks', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
  ), color: 'bg-violet-500' },
  { path: 'insurance', label: 'Insurance', desc: 'View policies', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
  ), color: 'bg-blue-500' },
  { path: 'loans', label: 'Loans', desc: 'Track EMIs', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" /></svg>
  ), color: 'bg-amber-500' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { homes, currentHome } = useHome();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Welcome */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight">
            Welcome back, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your household finances</p>
        </div>
        <Link
          to={currentHome ? `/homes/${currentHome.id}/settings` : '/settings'}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        Home Settings
        </Link>
      </div>

      {homes.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </div>
          <p className="text-gray-900 font-medium mb-1">No homes yet</p>
          <p className="text-gray-500 text-sm mb-4">Create or join a home to start managing finances.</p>
          <Link
            to="/settings"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-[13px] font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add a Home
          </Link>
        </div>
      ) : currentHome ? (
        <div>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
            <p className="text-sm text-gray-500">
              Managing <span className="font-medium text-gray-800">{currentHome.name}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {appSections.map((section) => (
              <Link
                key={section.path}
                to={`/homes/${currentHome.id}/${section.path}`}
                className="group flex flex-col items-start p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
              >
                <div className={`w-9 h-9 rounded-lg ${section.color} flex items-center justify-center text-white mb-3`}>
                  {section.icon}
                </div>
                <h3 className="text-sm font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">{section.label}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{section.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-500 mb-6">Select a home to view its finances.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {homes.map((membership) => (
              <Link
                key={membership.id}
                to={`/homes/${membership.home.id}`}
                className="group p-4 bg-white rounded-xl border border-gray-200 hover:border-indigo-200 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">{membership.home.name}</h3>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      membership.role === 'OWNER' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                    }`}>{membership.role}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400">Expenses · Cards · Insurance · Loans</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
