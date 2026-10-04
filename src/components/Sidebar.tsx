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

