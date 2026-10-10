import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Login } from './auth/Login';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';

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
import LandingPage from './pages/LandingPage';

// App layout: sidebar (drawer on small screens), top bar and page content
const AppLayout: React.FC = () => {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setNavOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="app-main">
        <Navbar onMenu={() => setNavOpen(true)} />
        <main className="app-content" key={location.pathname}>
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
          {/* Public Landing & Login Routes */}
          <Route path="/" element={<LandingPage />} />
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
            <Route path="/dashboard" element={<Dashboard />} />

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
