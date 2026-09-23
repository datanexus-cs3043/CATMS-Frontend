import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
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

// Layout with Sidebar and Navbar
const AppLayout: React.FC = () => (
  <div style={{ display: 'flex', minHeight: '100vh' }}>
    <Sidebar />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ padding: '24px', flex: 1 }}>
        <Outlet />
      </main>
    </div>
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes Layout */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/patients/:id" element={<PatientDetails />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/appointments/:id" element={<AppointmentDetails />} />
            <Route path="/doctors" element={<Doctors />} />
            <Route path="/doctors/:id" element={<DoctorDetails />} />
            <Route path="/treatments" element={<Treatments />} />

            {/* Financial Routes (Restricted) */}
            <Route path="/invoices" element={
              <ProtectedRoute allowedRoles={['admin', 'branch_manager', 'receptionist_cashier']}>
                <Invoices />
              </ProtectedRoute>
            } />
            <Route path="/invoices/:id" element={
              <ProtectedRoute allowedRoles={['admin', 'branch_manager', 'receptionist_cashier']}>
                <InvoiceDetails />
              </ProtectedRoute>
            } />
            <Route path="/payments" element={
              <ProtectedRoute allowedRoles={['admin', 'branch_manager', 'receptionist_cashier']}>
                <Payments />
              </ProtectedRoute>
            } />
            <Route path="/insurance" element={
              <ProtectedRoute allowedRoles={['admin', 'branch_manager', 'receptionist_cashier']}>
                <Insurance />
              </ProtectedRoute>
            } />

            {/* Admin / Branch Manager Routes */}
            <Route path="/staff" element={
              <ProtectedRoute allowedRoles={['admin', 'branch_manager']}>
                <Staff />
              </ProtectedRoute>
            } />
            <Route path="/branches" element={
              <ProtectedRoute allowedRoles={['admin', 'branch_manager']}>
                <Branches />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute allowedRoles={['admin', 'branch_manager']}>
                <Reports />
              </ProtectedRoute>
            } />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}