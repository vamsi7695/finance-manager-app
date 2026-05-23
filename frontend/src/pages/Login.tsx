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
        <h1>Finance Manager</h1>
        <p>Securely manage your expenses, cards, insurance & loans</p>
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => console.error('Google Login Failed')}
          />
        </div>
      </div>
    </div>
  );
}
