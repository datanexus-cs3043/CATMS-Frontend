import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';


type Tab = 'login' | 'register';

// Preserve the registration form until the backend exposes registration.
interface RegistrationForm {
  first_name: string; last_name: string; email: string; username: string;
  password: string; contact_details: string; date_of_birth: string;
  gender: string; address: string; branch_id: number;
}

const apiErrorMessage = (error: unknown, fallback: string) => {
  const detail = axios.isAxiosError(error) ? error.response?.data?.detail : undefined;
  return typeof detail === 'string' ? detail : fallback;
};


export const Login: React.FC = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  
  const [tab, setTab] = useState<Tab>('login');

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPwd, setShowLoginPwd] = useState(false);

  const [regForm, setRegForm] = useState<RegistrationForm>({
    first_name: '', last_name: '', email: '', username: '',
    password: '', contact_details: '', date_of_birth: '',
    gender: 'Male', address: '', branch_id: 1,
  });

  const [confirmPwd, setConfirmPwd] = useState('');
  const [regError, setRegError] = useState('');
  const regLoading = false;
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [successMsg, setSuccessMsg] = useState('');


  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const switchTab = (t: Tab) => {
    setTab(t); setStep(1); setRegError(''); setLoginError(''); setSuccessMsg('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      await login(loginForm);
      navigate('/');
    } catch (err) {
      setLoginError(apiErrorMessage(err, 'Incorrect username or password.'));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('Patient registration is not available yet.');
  };

  const canGoStep2 = !!(regForm.first_name && regForm.last_name && regForm.date_of_birth && regForm.gender);
  const passwordsDiffer = !!confirmPwd && confirmPwd !== regForm.password;


  return (
    <div className="auth-page">

      <div className="auth-brand">
        <div className="brand-mark" aria-hidden />
        <div>
          <div className="brand-name">MedSync</div>
          <div className="brand-sub">Colombo · Kandy · Galle</div>
        </div>
      </div>

      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'login'} className={`auth-tab${tab === 'login' ? ' active' : ''}`} onClick={() => switchTab('login')}>Sign in</button>
            <button role="tab" aria-selected={false} className="auth-tab" disabled title="Patient registration is not available yet">New patient (coming soon)</button>
          </div>

          {tab === 'login' && (
            <div style={{ animation: 'fadeIn 0.25s ease' }}>
              <h2>Welcome back</h2>

              {loginError && (
                <div className="alert alert-error">
                  {loginError}
                </div>
              )}

              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label" htmlFor="username">Username</label>
                  <input id="username" className="form-control" autoComplete="username" required
                    value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="password">Password</label>
                  <div className="input-with-action">
                    <input id="password" className="form-control" type={showLoginPwd ? 'text' : 'password'} autoComplete="current-password" required
                      value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} />
                    <button type="button" className="input-action" onClick={() => setShowLoginPwd(!showLoginPwd)}>
                      {showLoginPwd ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loginLoading}>
                  {loginLoading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>


            </div>
          )}
          
          {tab === 'register' && (
              <div style={{ animation: 'fadeIn 0.25s ease' }}>
                <h2>Create your account</h2>

                <div className="steps">
                  {['Personal details', 'Sign-in details'].map((label, i) => (
                    <div key={label} className={`step${step >= i + 1 ? ' on' : ''}`}>
                      <div className="step-bar" />
                      <div className="step-label">Step {i + 1} · {label}</div>
                    </div>
                  ))}
                </div>

                {successMsg && <div className="alert alert-success">{successMsg}</div>}
                {regError && <div className="alert alert-error">{regError}</div>}

                <form onSubmit={step === 1 ? (e) => { e.preventDefault(); if (canGoStep2) setStep(2); } : handleRegister}>
                  {step === 1 && (
                    <div style={{ animation: 'fadeIn 0.2s ease' }}>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">First name</label>
                          <input className="form-control" required value={regForm.first_name} onChange={e => setRegForm({ ...regForm, first_name: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Last name</label>
                          <input className="form-control" required value={regForm.last_name} onChange={e => setRegForm({ ...regForm, last_name: e.target.value })} />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Date of birth</label>
                          <input type="date" className="form-control" required value={regForm.date_of_birth} onChange={e => setRegForm({ ...regForm, date_of_birth: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Gender</label>
                          <select className="form-control" value={regForm.gender} onChange={e => setRegForm({ ...regForm, gender: e.target.value })}>
                            <option>Male</option><option>Female</option><option>Other</option>
                          </select>
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Phone number <span className="text-muted">(optional)</span></label>
                        <input className="form-control" placeholder="07X XXX XXXX" value={regForm.contact_details || ''} onChange={e => setRegForm({ ...regForm, contact_details: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Home branch</label>
                        <select className="form-control" value={regForm.branch_id} onChange={e => setRegForm({ ...regForm, branch_id: Number(e.target.value) })}>
                          <option value={1}>MedSync Colombo</option><option value={2}>MedSync Kandy</option><option value={3}>MedSync Galle</option>
                        </select>
                      </div>
                      <button type="submit" className="btn btn-primary btn-lg w-full" disabled={!canGoStep2}>Continue</button>
                    </div>
                  )}

                  {step === 2 && (
                    <div style={{ animation: 'fadeIn 0.2s ease' }}>
                      <div className="form-group">
                        <label className="form-label">Email address</label>
                        <input type="email" className="form-control" required value={regForm.email} onChange={e => setRegForm({ ...regForm, email: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Username</label>
                        <input className="form-control" required minLength={3} value={regForm.username} onChange={e => setRegForm({ ...regForm, username: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Password <span className="text-muted">(at least 6 characters)</span></label>
                        <div className="input-with-action">
                          <input type={showRegPwd ? 'text' : 'password'} className="form-control" required minLength={6}
                            value={regForm.password} onChange={e => setRegForm({ ...regForm, password: e.target.value })} />
                          <button type="button" className="input-action" onClick={() => setShowRegPwd(!showRegPwd)}>{showRegPwd ? 'Hide' : 'Show'}</button>
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Confirm password</label>
                        <input type="password" className="form-control" required value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                          style={passwordsDiffer ? { borderColor: 'var(--danger)' } : undefined} />
                        {passwordsDiffer && <p className="form-error">Passwords do not match.</p>}
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button type="button" className="btn btn-ghost btn-lg" onClick={() => setStep(1)}>Back</button>
                        <button type="submit" className="btn btn-primary btn-lg" style={{ flex: 1 }} disabled={regLoading || passwordsDiffer}>
                          {regLoading ? 'Creating account…' : 'Create account'}
                        </button>
                      </div>
                    </div>
                  )}
                </form>

              </div>
            )}
          </div>
        </main>
      </div>
    );
  };


//Tharushi
