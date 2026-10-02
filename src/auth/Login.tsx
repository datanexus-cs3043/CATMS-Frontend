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
        
        <div>
          <label>Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            style={{ width: '100%', marginBottom: '10px' }}
          />
        </div>
        <button type="submit">Sign In</button>
      </form>
    </div>
  );
};