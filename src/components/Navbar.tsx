import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ROLE_LABEL } from './Sidebar';


const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Today at MedSync' },
  '/appointments': { title: 'Appointments', subtitle: 'Bookings, walk-ins and rescheduling' },
  '/patients': { title: 'Patients', subtitle: 'Records shared across all branches' },
  '/doctors': { title: 'Doctors', subtitle: 'Specialists across our branches' },
  '/treatments': { title: 'Treatment Catalogue', subtitle: 'Services, codes and standard prices' },
  '/invoices': { title: 'Invoices', subtitle: 'Billing from completed treatments' },
  '/payments': { title: 'Payments', subtitle: 'Collections and doctor payouts' },
  '/insurance': { title: 'Insurance', subtitle: 'Policies, coverage terms and claims' },
  '/staff': { title: 'Staff', subtitle: 'Medical and non-medical staff' },
  '/branches': { title: 'Branches', subtitle: 'Colombo, Kandy and Galle' },
  '/reports': { title: 'Reports', subtitle: 'Management reporting' },
  '/my-appointments': { title: 'My Appointments', subtitle: 'Your appointments only' },
  '/my-patients': { title: 'My Patients', subtitle: 'Patients under your care' },
  '/my-bills': { title: 'My Bills', subtitle: 'Your invoices and payment status' },
  '/my-profile': { title: 'My Profile', subtitle: 'View and update your details' },
};


export const Navbar: React.FC<{ onMenu: () => void }> = ({ onMenu }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);


  return (
    <header className="topbar">
      <button className="menu-toggle" onClick={onMenu} aria-label="Open navigation">Menu</button>

      <div className="topbar-title">
        <h1>{info.title}{isDetail && <span style={{ color: 'var(--gray-400)', fontWeight: 500 }}> · Details</span>}</h1>
        {info.subtitle && <p>{info.subtitle}</p>}
      </div>

      {user?.role === 'receptionist_cashier' && (
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/appointments?new=1')}>New appointment</button>
      )}
      {user?.role === 'patient' && !location.pathname.startsWith('/my-appointments') && (
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/my-appointments?book=1')}>Book appointment</button>
      )}

      <div ref={ref} style={{ position: 'relative' }}>
        <button className="user-menu-btn" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open}>
          <span className="avatar" style={{ width: 30, height: 30 }}>{initials}</span>
          <span className="user-menu-text" style={{ textAlign: 'left' }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--gray-900)', lineHeight: 1.2 }}>{fullName}</span>
            <span style={{ display: 'block', fontSize: 11, color: 'var(--gray-500)' }}>{ROLE_LABEL[user?.role || ''] || user?.role}</span>
          </span>
        </button>

        {open && (
          <div className="dropdown" role="menu">
            <div style={{ padding: '14px 14px 12px', borderBottom: '1px solid var(--gray-100)' }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-900)' }}>{fullName}</div>
              <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>{user?.email || user?.username}</div>
            </div>
            <div style={{ padding: 6 }}>
              <button className="dropdown-item" onClick={() => go('/')}>Dashboard</button>
              {personal && <button className="dropdown-item" onClick={() => go('/my-profile')}>My profile</button>}
              {personal && <button className="dropdown-item" onClick={() => go('/my-appointments')}>My appointments</button>}
              {user?.role === 'patient' && <button className="dropdown-item" onClick={() => go('/my-bills')}>My bills</button>}
              <div style={{ height: 1, background: 'var(--gray-100)', margin: '6px 0' }} />
              <button className="dropdown-item danger" onClick={() => { setOpen(false); logout(); navigate('/login'); }}>Sign out</button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
