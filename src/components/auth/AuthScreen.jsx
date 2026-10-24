import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { showToast } from '../common/Toast';

export function AuthScreen({ appName = 'Mess Meal Manager' }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const { login, register } = useAuth();
  const { toggleMode } = useTheme();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ email: loginEmail.trim(), password: loginPassword });
      showToast('Signed in successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (regPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    setLoading(true);
    try {
      await register({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        phone: regPhone.trim() || undefined,
      });
      showToast('Account created successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 relative overflow-hidden">
      {/* Cosmic Starfield Ambient Background */}
      <div className="auth-rain-container"></div>

      {/* Auth Card on Top */}
      <div className="surface-card w-full max-w-sm p-4 sm:p-5 shadow-2xl space-y-4 relative z-10 backdrop-blur-md">
        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="w-10 h-10 sharp-xs theme-btn-primary mx-auto flex items-center justify-center shadow-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 15h4" />
              <path d="M19.424 11.095a2.5 2.5 0 00.471-2.309 2 2 0 00.424-3.286 2 2 0 00-2.143-3.322 2 2 0 00-.676.502 2 2 0 00-3.287.424 2.5 2.5 0 00-3.189 2.06A3 3 0 0012 11l4-4" />
              <path d="M4 12.006A1 1 0 014.994 11H19a1 1 0 011 1v7a2 2 0 01-2 2H6a2 2 0 01-2-2z" />
              <path d="M7 11a4 4 0 01-4-4V5a1 1 0 011-1h2a4 4 0 013.584 2.222" />
            </svg>
          </div>
          <h1 className="text-lg font-extrabold text-DynamicMain mt-2">{appName}</h1>
          <p className="text-xs text-DynamicMuted">Mess, Tour &amp; Personal Suite</p>
        </div>

        {/* Segmented Control */}
        <div className="grid grid-cols-2 p-1 surface-subtle sharp-xs gap-1">
          <button
            type="button"
            onClick={() => setTab('login')}
            className={`tap-active py-1.5 text-xs font-bold sharp-xs text-center transition whitespace-nowrap ${
              tab === 'login' ? 'theme-btn-primary' : 'text-DynamicMuted hover:text-DynamicMain'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setTab('register')}
            className={`tap-active py-1.5 text-xs font-bold sharp-xs text-center transition whitespace-nowrap ${
              tab === 'register' ? 'theme-btn-primary' : 'text-DynamicMuted hover:text-DynamicMain'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Sign In Form */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-2.5 py-1.5 text-xs surface-input sharp-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-2.5 py-1.5 text-xs surface-input sharp-xs"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="tap-active w-full py-2.5 theme-btn-primary sharp-xs text-xs font-bold shadow-sm transition hover:brightness-110 flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-50"
            >
              {loading ? <div className="spinner w-4 h-4"></div> : <span>SIGN IN</span>}
            </button>
          </form>
        )}

        {/* Register Form */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-2.5 py-1.5 text-xs surface-input sharp-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-2.5 py-1.5 text-xs surface-input sharp-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="017XXXXXXXX"
                className="w-full px-2.5 py-1.5 text-xs surface-input sharp-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-DynamicSec mb-1">
                Password (Min 6 chars)
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Create a strong password"
                className="w-full px-2.5 py-1.5 text-xs surface-input sharp-xs"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="tap-active w-full py-2.5 theme-btn-primary sharp-xs text-xs font-bold shadow-sm transition hover:brightness-110 flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-50"
            >
              {loading ? <div className="spinner w-4 h-4"></div> : <span>CREATE ACCOUNT</span>}
            </button>
          </form>
        )}

        {/* Footer Info */}
        <div className="text-center pt-2 border-t border-slate-700/30 flex items-center justify-between text-[11px] text-DynamicMuted">
          <span className="whitespace-nowrap flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Live Server API</span>
          </span>
          <button
            type="button"
            onClick={toggleMode}
            className="tap-active hover:text-DynamicMain font-medium"
          >
            Switch Theme
          </button>
        </div>
      </div>
    </div>
  );
}
