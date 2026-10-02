import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ROLE_LABEL } from './Sidebar';


export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

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

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span>{user?.username} ({user?.role})</span>
        <button onClick={logout}>Logout</button>
      </div>
    </header>
  );
};