import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

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
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => console.error('Google Login Failed')}
            shape="pill"
            size="large"
          />
        </div>
        <p className="mt-6 text-xs text-gray-400">Your data is encrypted end-to-end</p>
      </div>
    </div>
  );
}
