import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextInput, PasswordInput, InfoBanner } from '../components/shared';
import { authApi, authService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types';

type TabType = 'login' | 'signup';

export function Login() {
  const navigate = useNavigate();
  const { login: contextLogin, user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('CUSTOMER');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      if (['REP', 'MANAGER', 'FINANCE', 'ADMIN'].includes(user.role)) {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (activeTab === 'login') {
        // Use AuthContext login which handles user state
        const response = await contextLogin(email, password);
        
        // Redirect based on role
        if (['REP', 'MANAGER', 'FINANCE', 'ADMIN'].includes(response.user.role)) {
          navigate('/dashboard');
        } else {
          navigate('/portal');
        }
      } else {
        // Signup flow
        const response = await authApi.signup({ email, password, role });
        authService.setToken(response.token);
        
        // Store user data in localStorage for role-based access control
        localStorage.setItem('user', JSON.stringify(response.user));
        
        // Redirect based on role
        if (['REP', 'MANAGER', 'FINANCE', 'ADMIN'].includes(response.user.role)) {
          navigate('/dashboard');
        } else {
          navigate('/portal');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f0a1e 0%, #1a0b2e 50%, #0f0a1e 100%)' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #0f0a1e 0%, #1a0b2e 50%, #0f0a1e 100%)' }}>
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo Only */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src="/logo_dealflow.png" 
              alt="DealFlow360 Logo" 
              className="h-48 w-auto animate-fade-in"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <p className="text-gray-400 mt-2">CPQ System - Login Portal</p>
        </div>

        {/* Auth Card with inline purple glassmorphic style */}
        <div 
          className="rounded-2xl p-6 animate-fade-in backdrop-blur-md border" 
          style={{ 
            background: 'rgba(124, 58, 237, 0.05)',
            borderColor: 'rgba(124, 58, 237, 0.2)',
            boxShadow: '0 8px 32px 0 rgba(124, 58, 237, 0.15)',
            animationDelay: '0.2s' 
          }}
        >
          {/* Tab Toggle */}
          <div className="flex border-b border-dark-border mb-6">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-3 text-sm font-medium transition-all duration-300 ${
                activeTab === 'login'
                  ? 'border-b-2'
                  : 'hover:text-gray-200'
              }`}
              style={{
                color: activeTab === 'login' ? '#a78bfa' : '#9ca3af',
                borderBottomColor: activeTab === 'login' ? '#7c3aed' : 'transparent'
              }}
            >
              Log In
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-3 text-sm font-medium transition-all duration-300 ${
                activeTab === 'signup'
                  ? 'border-b-2'
                  : 'hover:text-gray-200'
              }`}
              style={{
                color: activeTab === 'signup' ? '#a78bfa' : '#9ca3af',
                borderBottomColor: activeTab === 'signup' ? '#7c3aed' : 'transparent'
              }}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <TextInput
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />

            <PasswordInput
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            {activeTab === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  Account Type
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="input"
                >
                  <option value="CUSTOMER">Customer</option>
                  <option value="REP">Sales Rep</option>
                  <option value="MANAGER">Manager</option>
                  <option value="FINANCE">Finance</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            )}

            {error && (
              <div className="text-danger text-sm bg-danger/10 border border-danger rounded-lg p-3 animate-fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-3 rounded-xl font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 transform hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-white"
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                boxShadow: '0 0 20px rgba(124, 58, 237, 0.4)'
              }}
            >
              {submitting ? (
                <span className="flex items-center justify-center">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                  Loading...
                </span>
              ) : (
                activeTab === 'login' ? 'Log In' : 'Sign Up'
              )}
            </button>

            {activeTab === 'login' && (
              <button
                type="button"
                className="w-full text-sm text-primary hover:text-primary-hover transition-colors duration-300"
              >
                Forgot Password?
              </button>
            )}
          </form>
        </div>

        {/* Info Banner */}
        <div className="mt-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <InfoBanner>
            <p className="text-sm">
              After login, internal users land on the Sales Dashboard. Customers land on their Quotation Portal.
            </p>
            <ul className="mt-3 space-y-1 text-xs text-yellow-300">
              <li>• Company / team selector shown for multi-team setups</li>
              <li>• Basic validation on email and password fields</li>
              <li>• Sign Up link creates a new internal or customer account</li>
            </ul>
          </InfoBanner>
        </div>
      </div>
    </div>
  );
}
