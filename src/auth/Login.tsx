import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { clinicPhotos } from '../components/HeroSlider';

const loginErrorMessage = (error: unknown): string => {
  if (!axios.isAxiosError(error)) return 'Unable to verify your sign-in session. Please try again.';
  if (error.code === 'ECONNABORTED') return 'Sign-in timed out. Please try again.';
  if (!error.response) return 'Cannot reach the sign-in service. Check your connection and try again.';
  const status = error.response.status;
  if (status === 401 || status === 403) return 'Incorrect username/email or password.';
  if (status === 429) return 'Too many sign-in attempts. Please wait before trying again.';
  if (status === 422) return 'Enter your username or email and password.';
  return 'The sign-in service is unavailable. Please try again later.';
};

export const Login: React.FC = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showAccountHelp, setShowAccountHelp] = useState(searchParams.get('tab') === 'register');
  const [bgIndex, setBgIndex] = useState(0);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const loginPending = useRef(false);

  useEffect(() => {
    if (clinicPhotos.length === 0) return;
    const interval = setInterval(() => setBgIndex(prev => (prev + 1) % clinicPhotos.length), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPending.current) return;
    const identifier = loginForm.username.trim();
    if (!identifier) { setLoginError('Enter your username or email.'); return; }
    loginPending.current = true;
    setLoginLoading(true);
    setLoginError('');
    try {
      await login(identifier, loginForm.password);
      navigate('/dashboard');
    } catch (err) {
      setLoginError(loginErrorMessage(err));
    } finally {
      loginPending.current = false;
      setLoginForm(form => ({ ...form, password: '' }));
      setShowLoginPwd(false);
      setLoginLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-slideshow" aria-hidden="true">
        {clinicPhotos.map((photo, i) => (
          <div key={photo} className={`auth-slideshow-slide ${i === bgIndex % clinicPhotos.length ? 'active' : ''}`}>
            <img src={photo} alt="" />
          </div>
        ))}
        <div className="auth-slideshow-overlay" />
      </div>
      <main className="auth-main">
        <div className="auth-brand-centered" onClick={() => navigate('/')} title="Return to MedSync Homepage"
          role="button" tabIndex={0} onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/'); }
          }}>
          <div className="brand-mark" aria-hidden />
          <div><div className="brand-name">MedSync</div><div className="brand-sub">Colombo · Kandy · Galle</div></div>
        </div>
        <div className="auth-card">
          <h2>Welcome back</h2>
          <p className="lead">Sign in to your patient portal or clinic staff account.</p>
          {loginError && <div className="alert alert-error" role="alert">{loginError}</div>}
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">Username or email</label>
              <input id="username" type="text" className="form-control" autoComplete="username"
                autoCapitalize="none" spellCheck={false} placeholder="Enter your username or email" required
                disabled={loginLoading} value={loginForm.username}
                onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div className="input-with-action">
                <input id="password" className="form-control" type={showLoginPwd ? 'text' : 'password'}
                  autoComplete="current-password" placeholder="Enter your password" required disabled={loginLoading}
                  value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} />
                <button type="button" className="input-action" disabled={loginLoading}
                  onClick={() => setShowLoginPwd(!showLoginPwd)} aria-label={showLoginPwd ? 'Hide password' : 'Show password'}>
                  {showLoginPwd ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loginLoading}>
              {loginLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <div className="auth-switch-prompt">
            <span>Need a patient account? </span>
            <button type="button" className="auth-switch-btn" aria-expanded={showAccountHelp}
              aria-controls="patient-account-help" onClick={() => setShowAccountHelp(value => !value)}>
              How to get an account
            </button>
          </div>
          {showAccountHelp && (
            <div id="patient-account-help" className="patient-notice-banner" role="note" style={{ marginTop: 16 }}>
              <div>
                <div className="patient-notice-title">Registration through clinic reception</div>
                <div className="patient-notice-desc">
                  Online self-registration is not available. Contact your clinic reception to register as a patient
                  and request portal access. Clinic administration manages staff accounts.
                  Once your account is issued, sign in above with your username or email.
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Login;
