import { NavLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useHome } from '../context/HomeContext';
import { useState, useRef, useEffect } from 'react';

const homeSubNav = [
  { path: 'expenses', label: 'Expenses' },
  { path: 'cards', label: 'Cards' },
  { path: 'insurance', label: 'Insurance' },
  { path: 'loans', label: 'Loans' },
];

export default function Header() {
  const { user, logout } = useAuth();
  const { homes, currentHome, setCurrentHome } = useHome();
  const location = useLocation();
  const navigate = useNavigate();
  const { homeId } = useParams<{ homeId: string }>();
  const [showHomeDropdown, setShowHomeDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const homeMatch = location.pathname.match(/^\/homes\/([^/]+)/);
  const activeHomeId = homeId || (homeMatch ? homeMatch[1] : null);

  useEffect(() => {
    if (activeHomeId && currentHome?.id !== activeHomeId) {
      const found = homes.find((m) => m.home.id === activeHomeId);
      if (found) setCurrentHome(found.home);
    }
  }, [activeHomeId, homes]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowHomeDropdown(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectHome = (home: { id: string; name: string; inviteCode: string; createdBy: string; createdAt: string }) => {
    setCurrentHome(home);
    setShowHomeDropdown(false);
    if (activeHomeId) {
      const subPath = location.pathname.replace(`/homes/${activeHomeId}`, '');
      navigate(`/homes/${home.id}${subPath}`);
    }
  };

  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-bold">F</span>
            </div>
            <span className="text-[15px] font-bold text-gray-900 tracking-tight hidden sm:block">
              FinanceManager
            </span>
          </NavLink>

          {/* Center: Sub-navigation when inside a home */}
          {activeHomeId && (
            <nav className="hidden md:flex items-center bg-gray-100/80 rounded-lg p-0.5">
              {homeSubNav.map((item) => {
                const isActive = location.pathname === `/homes/${activeHomeId}/${item.path}`;
                return (
                  <NavLink
                    key={item.path}
                    to={`/homes/${activeHomeId}/${item.path}`}
                    className={`px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
          )}

          {/* Right: Home selector + User */}
          <div className="flex items-center gap-2">
            {/* Home Dropdown */}
            {homes.length > 0 && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowHomeDropdown(!showHomeDropdown)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                  </svg>
                  <span className="max-w-[60px] sm:max-w-[100px] truncate">{currentHome?.name || 'Select Home'}</span>
                  <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${showHomeDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showHomeDropdown && (
                  <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-64 bg-white rounded-xl shadow-lg border border-gray-200/80 py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
                    <div className="px-3 py-1.5">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Your Homes</p>
                    </div>
                    {homes.map((membership) => (
                      <button
                        key={membership.id}
                        onClick={() => handleSelectHome(membership.home)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between ${
                          currentHome?.id === membership.home.id ? 'bg-indigo-50/60' : ''
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {currentHome?.id === membership.home.id && (
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                          )}
                          <span className={`truncate font-medium ${currentHome?.id === membership.home.id ? 'text-indigo-700' : 'text-gray-700'}`}>
                            {membership.home.name}
                          </span>
                        </span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          membership.role === 'OWNER' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'
                        }`}>{membership.role}</span>
                      </button>
                    ))}
                    <div className="border-t border-gray-100 mt-1.5 pt-1.5">
                      <NavLink
                        to="/settings"
                        onClick={() => setShowHomeDropdown(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Create / Join Home
                      </NavLink>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Menu */}
            {user && (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1.5 rounded-lg hover:bg-gray-50 transition-colors p-1 pr-2"
                >
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-7 h-7 rounded-full ring-2 ring-gray-100"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                      <span className="text-xs font-semibold text-white">
                        {user.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200/80 py-1.5 z-50">
                    <div className="px-4 py-2.5 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => { setShowUserMenu(false); logout(); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile sub-navigation */}
        {activeHomeId && (
          <nav className="md:hidden flex items-center gap-0.5 pb-2 overflow-x-auto">
            {homeSubNav.map((item) => {
              const isActive = location.pathname === `/homes/${activeHomeId}/${item.path}`;
              return (
                <NavLink
                  key={item.path}
                  to={`/homes/${activeHomeId}/${item.path}`}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}
