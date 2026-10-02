import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, hasRole } = useAuth();

  return (
    <aside style={{ width: '240px', padding: '16px', borderRight: '1px solid #ddd' }}>
      <h3>MedSync CATMS</h3>
      <p>Role: <strong>{user?.role}</strong></p>
      
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Link to="/">Dashboard</Link>
        <Link to="/patients">Patients</Link>
        <Link to="/appointments">Appointments</Link>
        <Link to="/doctors">Doctors</Link>
        <Link to="/treatments">Treatments</Link>

        {/* Financial links: restricted to admin, branch_manager, receptionist_cashier */}
        {hasRole(['admin', 'branch_manager', 'receptionist_cashier']) && (
          <>
            <Link to="/invoices">Invoices</Link>
            <Link to="/payments">Payments</Link>
            <Link to="/insurance">Insurance</Link>
          </>
        )}

        {/* Administrative links: restricted to admin, branch_manager */}
        {hasRole(['admin', 'branch_manager']) && (
          <>
            <Link to="/staff">Staff</Link>
            <Link to="/branches">Branches</Link>
            <Link to="/reports">Reports</Link>
          </>
        )}
      </nav>
    </aside>
  );
};