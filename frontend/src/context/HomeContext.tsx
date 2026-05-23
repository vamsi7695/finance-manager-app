import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Home, HomeMembership } from '../types';
import api from '../services/api';
import { useAuth } from './AuthContext';

interface HomeContextType {
  homes: HomeMembership[];
  currentHome: Home | null;
  setCurrentHome: (home: Home | null) => void;
  loadHomes: () => Promise<void>;
  isLoading: boolean;
  currencySymbol: string;
}

const HomeContext = createContext<HomeContextType | undefined>(undefined);

export function HomeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [homes, setHomes] = useState<HomeMembership[]>([]);
  const [currentHome, setCurrentHomeState] = useState<Home | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadHomes = async () => {
    try {
      const res = await api.get('/homes');
      setHomes(res.data);

      const savedHomeId = localStorage.getItem('currentHomeId');
      if (savedHomeId) {
        const found = res.data.find((m: HomeMembership) => m.home.id === savedHomeId);
        if (found) {
          setCurrentHomeState(found.home);
        } else if (res.data.length > 0) {
          setCurrentHomeState(res.data[0].home);
          localStorage.setItem('currentHomeId', res.data[0].home.id);
        }
      } else if (res.data.length > 0) {
        setCurrentHomeState(res.data[0].home);
        localStorage.setItem('currentHomeId', res.data[0].home.id);
      }
    } catch {
      // Not authenticated yet
    } finally {
      setIsLoading(false);
    }
  };

  const setCurrentHome = (home: Home | null) => {
    setCurrentHomeState(home);
    if (home) {
      localStorage.setItem('currentHomeId', home.id);
    } else {
      localStorage.removeItem('currentHomeId');
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadHomes();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const currencySymbolMap: Record<string, string> = {
    INR: '\u20B9', USD: '$', EUR: '\u20AC', GBP: '\u00A3',
    JPY: '\u00A5', AUD: 'A$', CAD: 'C$',
  };
  const currencySymbol = currencySymbolMap[currentHome?.currency || 'INR'] || '\u20B9';

  return (
    <HomeContext.Provider value={{ homes, currentHome, setCurrentHome, loadHomes, isLoading, currencySymbol }}>
      {children}
    </HomeContext.Provider>
  );
}

export function useHome() {
  const context = useContext(HomeContext);
  if (!context) {
    throw new Error('useHome must be used within a HomeProvider');
  }
  return context;
}
