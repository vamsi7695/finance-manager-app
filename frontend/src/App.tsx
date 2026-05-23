import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import { HomeProvider } from './context/HomeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Cards from './pages/Cards';
import InsurancePage from './pages/Insurance';
import Loans from './pages/Loans';
import HomeDashboard from './pages/HomeDashboard';
import HomeSettings from './pages/HomeSettings';
import Settings from './pages/Settings';
import './App.scss';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// Ping backend on app load to wake Render free tier from cold start
function useWakeBackend() {
  useEffect(() => {
    fetch(`${API_BASE_URL}/auth/health`).catch(() => {});
  }, []);
}

function App() {
  useWakeBackend();
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <HomeProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/homes/:homeId" element={<ProtectedRoute><Layout><HomeDashboard /></Layout></ProtectedRoute>}>
                <Route path="expenses" element={<Expenses />} />
                <Route path="cards" element={<Cards />} />
                <Route path="insurance" element={<InsurancePage />} />
                <Route path="loans" element={<Loans />} />
              </Route>
              <Route path="/homes/:homeId/settings" element={<ProtectedRoute><Layout><HomeSettings /></Layout></ProtectedRoute>} />
              <Route path="/homes/:homeId/guest/:code" element={<ProtectedRoute><Layout><HomeDashboard /></Layout></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
              <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
            </Routes>
          </BrowserRouter>
        </HomeProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
