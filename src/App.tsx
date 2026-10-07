import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Login } from './auth/Login';
import { Sidebar, ROLE_LABEL } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { useAuth } from './auth/AuthContext';

// Page Imports
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetails from './pages/PatientDetails';
import Appointments from './pages/Appointments';
import AppointmentDetails from './pages/AppointmentDetails';
import Doctors from './pages/Doctors';
import DoctorDetails from './pages/DoctorDetails';
import Treatments from './pages/Treatments';
import Invoices from './pages/Invoices';
import InvoiceDetails from './pages/InvoiceDetails';
import Payments from './pages/Payments';
import Insurance from './pages/Insurance';
import Staff from './pages/Staff';
import Branches from './pages/Branches';
import Reports from './pages/Reports';
import MyAppointments from './pages/Myappointments';
import MyBills from './pages/MyBills';
import MyProfile from './pages/MyProfile';
import MyPatients from './pages/MyPatients';

// ── Demo bar: switch roles while testing without a backend ──────────────────
const ROLES = [
  { key: 'admin', label: 'Admin' },
  { key: 'branch_manager', label: 'Manager' },
  { key: 'receptionist_cashier', label: 'Cashier' },
  { key: 'doctor', label: 'Doctor' },
  { key: 'patient', label: 'Patient' },
];

const demoBtn = 'rounded-sm border border-white/20 bg-transparent px-[9px] py-[3px] text-2xs font-medium text-[#dbe9f6] transition-all hover:bg-white/10 hover:text-white';

const DemoBanner: React.FC = () => {
  const { isDemoMode, user, loginAsDemo, logout, resetDemoData } = useAuth();
  const navigate = useNavigate();

  if (!isDemoMode) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 bg-primary-900 px-5 py-[7px] text-xs text-[#dbe9f6] max-sm:px-3">
      <div>
        Demo mode · signed in as <strong className="font-semibold text-white">{user?.first_name} {user?.last_name}</strong> ({ROLE_LABEL[user?.role || '']}) · changes are saved in this browser
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {ROLES.map(r => (
          <button
            key={r.key}
            className={`${demoBtn} ${user?.role === r.key ? 'border-white bg-white font-semibold text-primary-900' : ''}`}
            onClick={() => { loginAsDemo(r.key); navigate('/'); }}
          >
            {r.label}
          </button>
        ))}
        <button
          className={demoBtn}
          title="Restore the original sample data"
          onClick={() => {
            if (confirm('Reset all demo data to the original sample records? Any bookings, payments and edits made in this browser will be lost.')) {
              resetDemoData();
              navigate('/');
            }
          }}
        >
          Reset data
        </button>
        <button className={demoBtn} onClick={() => { logout(); navigate('/login'); }}>Exit</button>
      </div>
    </div>
  );
};

// App layout: sidebar (drawer on small screens), top bar and page content
const AppLayout: React.FC = () => {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setNavOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-off-white">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DemoBanner />
        <Navbar onMenu={() => setNavOpen(true)} />
        <main className="mx-auto w-full max-w-[1440px] flex-1 animate-fade-in px-8 pt-7 pb-10 max-lg:px-5 max-lg:pt-6 max-lg:pb-9 max-sm:px-3.5 max-sm:pt-[18px] max-sm:pb-8" key={location.pathname}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected App Routes with Layout */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* ── Dashboard (all roles) ─────────────────────────── */}
            <Route path="/" element={<Dashboard />} />

            {/* ── Role-specific personal pages ─────────────────── */}
            <Route
              path="/my-appointments"
              element={
                <ProtectedRoute allowedRoles={['doctor', 'patient']}>
                  <MyAppointments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-profile"
              element={
                <ProtectedRoute allowedRoles={['doctor', 'patient']}>
                  <MyProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-patients"
              element={
                <ProtectedRoute allowedRoles={['doctor']}>
                  <MyPatients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-bills"
              element={
                <ProtectedRoute allowedRoles={['patient']}>
                  <MyBills />
                </ProtectedRoute>
              }
            />

            {/* ── Clinical Routes (Admin, Manager, Cashier only) ─── */}
            <Route
              path="/appointments"
              element={
                <ProtectedRoute allowedRoles={['admin', 'branch_manager', 'receptionist_cashier']}>
                  <Appointments />
                </ProtectedRoute>
              }
            />
            {/* Detail pages: the data layer only returns records the user may see */}
            <Route path="/appointments/:id" element={<AppointmentDetails />} />

            <Route
              path="/patients"
              element={
                <ProtectedRoute allowedRoles={['admin', 'branch_manager', 'receptionist_cashier']}>
                  <Patients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patients/:id"
              element={
                <ProtectedRoute allowedRoles={['admin', 'branch_manager', 'receptionist_cashier', 'doctor']}>
                  <PatientDetails />
                </ProtectedRoute>
              }
            />

            {/* Doctors list — patients can view to book, admins/staff can manage, doctors CANNOT view other doctors */}
            <Route
              path="/doctors"
              element={
                <ProtectedRoute allowedRoles={['admin', 'branch_manager', 'receptionist_cashier', 'patient']}>
                  <Doctors />
                </ProtectedRoute>
              }
            />
            <Route
              path="/doctors/:id"
              element={
                <ProtectedRoute allowedRoles={['admin', 'branch_manager', 'receptionist_cashier', 'patient']}>
                  <DoctorDetails />
                </ProtectedRoute>
              }
            />

            <Route path="/treatments" element={<Treatments />} />

            {/* ── Financial Routes (Admin, Branch Manager, Cashier) ─── */}
            <Route
              path="/invoices"
              element={
                <ProtectedRoute allowedRoles={['admin', 'branch_manager', 'receptionist_cashier']}>
                  <Invoices />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices/:id"
              element={
                <ProtectedRoute allowedRoles={['admin', 'branch_manager', 'receptionist_cashier', 'patient']}>
                  <InvoiceDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payments"
              element={
                <ProtectedRoute allowedRoles={['admin', 'branch_manager', 'receptionist_cashier']}>
                  <Payments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/insurance"
              element={
                <ProtectedRoute allowedRoles={['admin', 'branch_manager', 'receptionist_cashier']}>
                  <Insurance />
                </ProtectedRoute>
              }
            />

            {/* ── Admin Routes (Admin & Branch Manager only) ─── */}
            <Route
              path="/staff"
              element={
                <ProtectedRoute allowedRoles={['admin', 'branch_manager']}>
                  <Staff />
                </ProtectedRoute>
              }
            />
            <Route
              path="/branches"
              element={
                <ProtectedRoute allowedRoles={['admin', 'branch_manager']}>
                  <Branches />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={['admin', 'branch_manager']}>
                  <Reports />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}