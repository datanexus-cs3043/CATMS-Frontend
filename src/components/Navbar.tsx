import React from 'react';
import { useAuth } from '../auth/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header style={{ padding: '12px 24px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <strong>Clinic Management System</strong>
        {user?.branch_id && <span> | Branch #{user.branch_id}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span>{user?.username} ({user?.role})</span>
        <button onClick={logout}>Logout</button>
      </div>
    </header>
  );
};