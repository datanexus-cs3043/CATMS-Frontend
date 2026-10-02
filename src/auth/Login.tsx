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
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <h2>MedSync CATMS - Login</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>Username</label>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required 
            style={{ width: '100%', marginBottom: '10px' }}
          />
        </div>
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