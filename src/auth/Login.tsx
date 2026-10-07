import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService, RegisterRequest } from '../services/api';
import { clinicPhotos } from '../components/HeroSlider';

type Tab = 'login' | 'register';

interface RegistrationForm extends RegisterRequest {
  // matches RegisterRequest
}

const apiErrorMessage = (error: unknown, fallback: string) => {
  const detail = axios.isAxiosError(error) ? error.response?.data?.detail : undefined;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  return fallback;
};

export const Login: React.FC = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [tab, setTab] = useState<Tab>(searchParams.get('tab') === 'register' ? 'register' : 'login');

  // Background slideshow state
  const [bgIndex, setBgIndex] = useState(0);

  // Sign-in form state
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPwd, setShowLoginPwd] = useState(false);

  // Registration form state
  const [regForm, setRegForm] = useState<RegistrationForm>({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    password: '',
    contact_details: '',
    date_of_birth: '',
    gender: 'Male',
    address: '',
    branch_id: 1,
  });

  const [confirmPwd, setConfirmPwd] = useState('');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [successMsg, setSuccessMsg] = useState('');

  // Automatic background slideshow cycling
  useEffect(() => {
    if (clinicPhotos.length === 0) return;
    const interval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % clinicPhotos.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const switchTab = (t: Tab) => {
    setTab(t);
    setStep(1);
    setRegError('');
    setLoginError('');
    setSuccessMsg('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      await login(loginForm.username, loginForm.password);
      navigate('/dashboard');
    } catch (err) {
      setLoginError(apiErrorMessage(err, 'Incorrect username or password.'));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmPwd !== regForm.password) {
      setRegError('Passwords do not match.');
      return;
    }
    setRegLoading(true);
    setRegError('');
    setSuccessMsg('');

    try {
      const res = await authService.register(regForm);
      setSuccessMsg(res.message || 'Account created successfully! Signing you in...');

      // Attempt automatic sign-in with the newly created patient credentials
      try {
        await login(regForm.username, regForm.password);
        navigate('/dashboard');
      } catch {
        // If automatic sign-in doesn't immediately succeed, pre-fill login form and switch tab
        setLoginForm({ username: regForm.username, password: regForm.password });
        setTab('login');
        setSuccessMsg('Account created successfully! Please sign in with your credentials.');
      }
    } catch (err) {
      setRegError(apiErrorMessage(err, 'Failed to create patient account. Please try again.'));
    } finally {
      setRegLoading(false);
    }
  };

  const canGoStep2 = !!(
    regForm.first_name.trim() &&
    regForm.last_name.trim() &&
    regForm.date_of_birth &&
    regForm.gender &&
    regForm.contact_details?.trim()
  );

  const passwordsDiffer = !!confirmPwd && confirmPwd !== regForm.password;

  return (
    <div className="auth-page">
      {/* ── Automatic Background Slideshow ─────────────────────── */}
      <div className="auth-slideshow" aria-hidden="true">
        {clinicPhotos.map((photo, i) => (
          <div
            key={photo}
            className={`auth-slideshow-slide ${i === bgIndex % clinicPhotos.length ? 'active' : ''}`}
          >
            <img src={photo} alt="" />
          </div>
        ))}
        <div className="auth-slideshow-overlay" />
      </div>

      {/* ── Centered Auth Container ────────────────────────────── */}
      <main className="auth-main">
        {/* Brand Header */}
        <div
          className="auth-brand-centered"
          onClick={() => navigate('/')}
          title="Return to MedSync Homepage"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') navigate('/');
          }}
        >
          <div className="brand-mark" aria-hidden />
          <div>
            <div className="brand-name">MedSync</div>
            <div className="brand-sub">Colombo · Kandy · Galle</div>
          </div>
        </div>

        {/* Auth Card */}
        <div className="auth-card">
          {/* Navigation Tabs */}
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'login'}
              className={`auth-tab${tab === 'login' ? ' active' : ''}`}
              onClick={() => switchTab('login')}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'register'}
              className={`auth-tab${tab === 'register' ? ' active' : ''}`}
              onClick={() => switchTab('register')}
            >
              Register (Sign up)
            </button>
          </div>

          {/* ── Sign In Form ─────────────────────────────────────── */}
          {tab === 'login' && (
            <div style={{ animation: 'fadeIn 0.25s ease' }}>
              <h2>Welcome back</h2>
              <p className="lead">Sign in to your patient portal or clinic staff account.</p>

              {successMsg && <div className="alert alert-success">{successMsg}</div>}
              {loginError && <div className="alert alert-error">{loginError}</div>}

              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label" htmlFor="username">
                    Username
                  </label>
                  <input
                    id="username"
                    className="form-control"
                    autoComplete="username"
                    placeholder="Enter your username"
                    required
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="password">
                    Password
                  </label>
                  <div className="input-with-action">
                    <input
                      id="password"
                      className="form-control"
                      type={showLoginPwd ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      required
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    />
                    <button
                      type="button"
                      className="input-action"
                      onClick={() => setShowLoginPwd(!showLoginPwd)}
                      aria-label={showLoginPwd ? 'Hide password' : 'Show password'}
                    >
                      {showLoginPwd ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg w-full"
                  disabled={loginLoading}
                >
                  {loginLoading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <span className="text-sm text-gray-500">Need a patient account? </span>
                <button
                  type="button"
                  className="text-sm font-semibold text-primary hover:underline bg-transparent border-0 cursor-pointer p-0"
                  onClick={() => switchTab('register')}
                >
                  Register here
                </button>
              </div>
            </div>
          )}

          {/* ── Registration Form ────────────────────────────────── */}
          {tab === 'register' && (
            <div style={{ animation: 'fadeIn 0.25s ease' }}>
              <h2>Create your account</h2>

              {/* Patient Role Scope Notice */}
              <div className="patient-notice-banner">
                <span className="patient-notice-icon" aria-hidden="true">
                  ℹ️
                </span>
                <div>
                  <div className="patient-notice-title">Patient Registration Only</div>
                  <div className="patient-notice-desc">
                    Self-registration is available exclusively for <strong>Patients</strong>. Doctor, Staff, Receptionist, and Branch Administrator accounts are issued directly by Clinic Administration.
                  </div>
                </div>
              </div>

              {/* Two-step progress bar */}
              <div className="steps">
                {['Personal details', 'Sign-in details'].map((label, i) => (
                  <div key={label} className={`step${step >= i + 1 ? ' on' : ''}`}>
                    <div className="step-bar" />
                    <div className="step-label">
                      Step {i + 1} · {label}
                    </div>
                  </div>
                ))}
              </div>

              {successMsg && <div className="alert alert-success">{successMsg}</div>}
              {regError && <div className="alert alert-error">{regError}</div>}

              <form
                onSubmit={
                  step === 1
                    ? (e) => {
                        e.preventDefault();
                        if (canGoStep2) setStep(2);
                      }
                    : handleRegister
                }
              >
                {/* Step 1: Personal Clinical Details */}
                {step === 1 && (
                  <div style={{ animation: 'fadeIn 0.2s ease' }}>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">First name *</label>
                        <input
                          className="form-control"
                          required
                          placeholder="e.g. Kasun"
                          value={regForm.first_name}
                          onChange={(e) => setRegForm({ ...regForm, first_name: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Last name *</label>
                        <input
                          className="form-control"
                          required
                          placeholder="e.g. Perera"
                          value={regForm.last_name}
                          onChange={(e) => setRegForm({ ...regForm, last_name: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Date of birth *</label>
                        <input
                          type="date"
                          className="form-control"
                          required
                          max={new Date().toISOString().split('T')[0]}
                          value={regForm.date_of_birth}
                          onChange={(e) => setRegForm({ ...regForm, date_of_birth: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Gender *</label>
                        <select
                          className="form-control"
                          value={regForm.gender}
                          onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Phone number *</label>
                      <input
                        className="form-control"
                        placeholder="e.g. 071 234 5678"
                        required
                        value={regForm.contact_details || ''}
                        onChange={(e) => setRegForm({ ...regForm, contact_details: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Residential address</label>
                      <input
                        className="form-control"
                        placeholder="e.g. 124 Galle Road, Colombo 03"
                        value={regForm.address || ''}
                        onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Preferred home clinic branch *</label>
                      <select
                        className="form-control"
                        value={regForm.branch_id}
                        onChange={(e) => setRegForm({ ...regForm, branch_id: Number(e.target.value) })}
                      >
                        <option value={1}>MedSync Colombo (Central Hospital & Specialist Clinic)</option>
                        <option value={2}>MedSync Kandy (Hill Country Healthcare Center)</option>
                        <option value={3}>MedSync Galle (Southern Coastal Medical Facility)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary btn-lg w-full"
                      disabled={!canGoStep2}
                    >
                      Continue to Sign-in Details →
                    </button>
                  </div>
                )}

                {/* Step 2: Sign-in Credentials */}
                {step === 2 && (
                  <div style={{ animation: 'fadeIn 0.2s ease' }}>
                    <div className="form-group">
                      <label className="form-label">Email address *</label>
                      <input
                        type="email"
                        className="form-control"
                        required
                        placeholder="e.g. kasun@example.com"
                        value={regForm.email}
                        onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Username *</label>
                      <input
                        className="form-control"
                        required
                        minLength={3}
                        placeholder="Choose a username (min. 3 characters)"
                        value={regForm.username}
                        onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Password *</label>
                      <div className="input-with-action">
                        <input
                          type={showRegPwd ? 'text' : 'password'}
                          className="form-control"
                          required
                          minLength={6}
                          placeholder="At least 6 characters"
                          value={regForm.password}
                          onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                        />
                        <button
                          type="button"
                          className="input-action"
                          onClick={() => setShowRegPwd(!showRegPwd)}
                          aria-label={showRegPwd ? 'Hide password' : 'Show password'}
                        >
                          {showRegPwd ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Confirm password *</label>
                      <div className="input-with-action">
                        <input
                          type={showConfirmPwd ? 'text' : 'password'}
                          className="form-control"
                          required
                          placeholder="Re-enter your password"
                          value={confirmPwd}
                          onChange={(e) => setConfirmPwd(e.target.value)}
                          style={passwordsDiffer ? { borderColor: 'var(--danger)' } : undefined}
                        />
                        <button
                          type="button"
                          className="input-action"
                          onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                          aria-label={showConfirmPwd ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPwd ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      {passwordsDiffer && (
                        <p className="form-error text-danger text-xs mt-1">Passwords do not match.</p>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-lg"
                        onClick={() => setStep(1)}
                      >
                        ← Back
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        style={{ flex: 1 }}
                        disabled={regLoading || passwordsDiffer}
                      >
                        {regLoading ? 'Creating patient account…' : 'Complete Registration'}
                      </button>
                    </div>
                  </div>
                )}
              </form>

              <div className="mt-4 text-center">
                <span className="text-sm text-gray-500">Already registered? </span>
                <button
                  type="button"
                  className="text-sm font-semibold text-primary hover:underline bg-transparent border-0 cursor-pointer p-0"
                  onClick={() => switchTab('login')}
                >
                  Sign in here
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Login;
