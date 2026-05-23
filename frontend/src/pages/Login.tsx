import { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [backendReady, setBackendReady] = useState(false);
  const [waking, setWaking] = useState(true);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 20; // up to ~60 seconds

    const ping = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/health`);
        if (res.ok) {
          setBackendReady(true);
          setWaking(false);
          return;
        }
      } catch {}
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(ping, 3000);
      } else {
        setWaking(false); // show login anyway after timeout
      }
    };

    ping();
  }, []);

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (credentialResponse.credential) {
      await login(credentialResponse.credential);
      navigate('/dashboard');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-5">
          <span className="text-3xl">💸</span>
        </div>
        <h1>Finance Manager</h1>
        <p>Securely manage your household expenses, cards, insurance & loans — all in one place.</p>

        {waking && !backendReady ? (
          <div className="flex flex-col items-center gap-2 mt-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
            <p className="text-xs text-gray-400">Starting up server, please wait…</p>
          </div>
        ) : (
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => console.error('Google Login Failed')}
              shape="pill"
              size="large"
            />
          </div>
        )}

        <p className="mt-6 text-xs text-gray-400">Your data is encrypted end-to-end</p>
      </div>
    </div>
  );
}
