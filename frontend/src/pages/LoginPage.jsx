import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LogIn, Sparkles, AlertCircle } from 'lucide-react';

const LoginPage = () => {
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirectPath = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please provide email/username and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(identifier.trim(), password);
      addToast('Welcome back!', 'success');
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Quick Demo Login Helper
  const handleQuickLogin = (demoIdentifier, demoPassword) => {
    setIdentifier(demoIdentifier);
    setPassword(demoPassword);
    setLoading(true);
    login(demoIdentifier, demoPassword)
      .then(() => {
        addToast('Logged in as demo user!', 'success');
        navigate(redirectPath, { replace: true });
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message);
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#181818] p-8 rounded-3xl border border-gray-200 dark:border-[#282828] shadow-2xl">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-500 to-red-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-brand-500/20">
            <svg className="w-6 h-6 text-white fill-current ml-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Sign In to VidSphere
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Stream, upload, and interact with your favorite creators
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-500 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Email or Username
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="aarav@viewtube.io or aarav_sharma"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-[#333] bg-transparent text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-[#333] bg-transparent text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-brand-500/20 transition flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Signing in...' : 'Sign In'}</span>
          </button>
        </form>

        {/* Quick Demo Logins for Pair Programming & Testing */}
        <div className="mt-6 pt-5 border-t border-gray-100 dark:border-[#252525]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Instant 1-Click Demo Logins:</span>
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickLogin('aarav@viewtube.io', 'password123')}
              className="p-2 rounded-xl bg-gray-100 dark:bg-[#222] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] text-gray-800 dark:text-gray-200 font-medium transition text-left"
            >
              <div className="font-bold truncate">Aarav Sharma</div>
              <div className="text-[10px] text-gray-500">Aarav Explains (Creator)</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('priya@viewtube.io', 'password123')}
              className="p-2 rounded-xl bg-gray-100 dark:bg-[#222] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] text-gray-800 dark:text-gray-200 font-medium transition text-left"
            >
              <div className="font-bold truncate">Priya Nair</div>
              <div className="text-[10px] text-gray-500">Priya Outside (Creator)</div>
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-500 font-semibold hover:underline">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
