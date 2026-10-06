import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface NavSection {
  section: string;
  items: {path: string; label: string}[];
}

const ADMIN_NAV: NavSection[] = [
  { section: 'Overview', items: [
    { path: '/', label: 'Dashboard' },
    { path: '/reports', label: 'Reports' },
  ]},
  { section: 'Clinical', items: [
    { path: '/appointments', label: 'Appointments' },
    { path: '/patients', label: 'Patients' },
    { path: '/doctors', label: 'Doctors' },
    { path: '/treatments', label: 'Treatment Catalogue' },
  ]},
  { section: 'Billing', items: [
    { path: '/invoices', label: 'Invoices' },
    { path: '/payments', label: 'Payments' },
    { path: '/insurance', label: 'Insurance' },
  ]},
  { section: 'Administration', items: [
    { path: '/staff', label: 'Staff' },
    { path: '/branches', label: 'Branches' },
  ]},
];

const CASHIER_NAV: NavSection[] = [
  { section: 'Front Desk', items: [
    { path: '/', label: 'Dashboard' },
    { path: '/appointments', label: 'Appointments' },
    { path: '/patients', label: 'Patients' },
    { path: '/doctors', label: 'Doctors' },
    { path: '/treatments', label: 'Treatment Catalogue' },
  ]},
  { section: 'Billing', items: [
    { path: '/invoices', label: 'Invoices' },
    { path: '/payments', label: 'Payments' },
    { path: '/insurance', label: 'Insurance' },
  ]},
];

const DOCTOR_NAV: NavSection[] = [
  { section: 'My Practice', items: [
    { path: '/', label: 'Dashboard' },
    { path: 'my-appointments', label: 'My Appointments' },
    { path: '/my-patients', label: 'My Patients' },
    { path: 'my-profile', label: 'My Profile' },
  ]},

  { section: 'Reference', items: [
    {path: '/treatments', label: 'Treatment Catalogue' },
  ]},
];

const PATIENT_NAV: NavSection[] = [
  { section: 'My Care', items: [
    { path: '/', label: 'Dashboard' },
    { path: '/my-appointments', label: 'My Appointments' },
    { path: 'my-bills', label: 'My Bills' },
    { path: 'my-profile', label: 'My Profile' },
  ]},
  { section: 'Find Care', items: [
    { path: '/doctors', label: 'Find a doctor' },
    { path: 'treatments', label: 'Service & Prices' },
  ]},
];

export const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator',
  branch_manager: 'Branch Manager',
  doctor: 'Doctor',
  receptionist_cashier: 'Receptionist / Cashier',
  patient: 'Patient',
};

export const Sidebar: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const role = user?.role || '';
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'User';
  const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const sections =
    role === 'admin' || role === 'branch_manager' ? ADMIN_NAV :
    role === 'receptionist_cashier' ? CASHIER_NAV :
    role === 'doctor' ? DOCTOR_NAV :
    role === 'patient' ? PATIENT_NAV : ADMIN_NAV;

  const isActive = (path: string) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));

  return (
    <>
      <div className={`sidebar-backdrop${open ? ' open' : ''}`} onClick={onClose} />
      <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-brand">
          <div className="brand-mark" aria-hidden />
          <div>
            <div className="brand-name">MedSync</div>
            <div className="brand-sub">Colombo · Kandy · Galle</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {sections.map(section => (
            <div key={section.section} className="nav-section">
              <div className="nav-section-title">{section.section}</div>
              {section.items.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`nav-link${isActive(item.path) ? ' active' : ''}`}
                  onClick={onClose}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar">{initials}</div>
            <div style={{ minWidth: 0 }}>
              <div className="sidebar-user-name">{fullName}</div>
              <div className="sidebar-user-role">{ROLE_LABEL[role] || role}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm w-full" onClick={() => { logout(); navigate('/login'); }}>
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
};
