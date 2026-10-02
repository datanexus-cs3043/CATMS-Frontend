import React, { useState,useEffect } from 'react';
import { useAuth } from './AuthContext';
import { authService,branchService,apiErrorMessage,RegisterRequest,Branch } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { HeroSlider,photosByName } from '../components/HeroSlider';


type Tab = 'login' | 'register';

// Demo accounts (password check happens in the data layer)
const DEMO_ROLES = [
  { role: 'admin', label: 'Administrator', username: 'admin_user', password: 'admin123' },
  { role: 'branch_manager', label: 'Branch Manager', username: 'manager_kandy', password: 'manager123' },
  { role: 'receptionist_cashier', label: 'Receptionist', username: 'cashier_user', password: 'cashier123' },
  { role: 'doctor', label: 'Doctor', username: 'doctor_silva', password: 'doctor123' },
  { role: 'patient', label: 'Patient', username: 'patient_kamal', password: 'patient123' },
];

// Login carousel photos (src/assets), each paired with one short line.
const LOGIN_PHOTOS = photosByName(['749802.webp', '2664853.webp', 'R.jpg', '6853908.webp']);
const SLIDES = [
  { eyebrow: 'Colombo · Kandy · Galle', title: 'Care, closer to home.' },
  { eyebrow: 'Your doctors', title: 'Specialists who know your history.' },
  { eyebrow: 'Patients first', title: 'Clear answers. Clear bills.' },
  { eyebrow: 'Treatment', title: 'Expert care when it matters.' },
];


export const Login: React.FC = () => {
  const { login,loginAsDemo,user } = useAuth();
  const navigate = useNavigate();
  
  const [tab, setTab] = useState<Tab>('login');

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPwd, setShowLoginPwd] = useState(false);

  const [regForm, setRegForm] = useState<RegisterRequest>({
    first_name: '', last_name: '', email: '', username: '',
    password: '', contact_details: '', date_of_birth: '',
    gender: 'Male', address: '', branch_id: 1,
  });

  const [confirmPwd, setConfirmPwd] = useState('');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const [successMsg, setSuccessMsg] = useState('');
  const [demoLoading, setDemoLoading] = useState<string | null>(null);


  return (
    <div className="auth-page">
      <HeroSlider slides={SLIDES} photos={LOGIN_PHOTOS} className="hero-slider auth-backdrop" interval={7000} pauseOnHover={false} />

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
            <button role="tab" aria-selected={tab === 'register'} className={`auth-tab${tab === 'register' ? ' active' : ''}`} onClick={() => switchTab('register')}>New patient</button>
          </div>

          {tab === 'login' && (
            <div style={{ animation: 'fadeIn 0.25s ease' }}>
              <h2>Welcome back</h2>

              {loginError && (
                <div className="alert alert-error">
                  <div>
                    {loginError}{' '}
                    <button className="btn-link" onClick={() => handleDemoLogin('admin')}>Continue as demo administrator</button>
                  </div>
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

              <div className="or-rule">or explore a demo account</div>
              <div className="demo-chips">
                {DEMO_ROLES.map(r => (
                  <button key={r.role} type="button" className="demo-chip" title={`${r.username} / ${r.password}`}
                    onClick={() => handleDemoLogin(r.role)} disabled={demoLoading !== null}>
                    {demoLoading === r.role ? 'Opening…' : r.label}
                  </button>
                ))}
              </div>

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
                          {branches.length > 0
                            ? branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>)
                            : <><option value={1}>MedSync Colombo</option><option value={2}>MedSync Kandy</option><option value={3}>MedSync Galle</option></>}
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
