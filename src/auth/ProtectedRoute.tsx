import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { UserRole } from '../services/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-fullpage">
        <div className="spinner spinner-lg" />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: 600, color: 'var(--gray-700)', marginBottom: 4 }}>Loading MedSync</p>
          <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>Verifying your session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role as UserRole)) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: 12,
        padding: 40,
        textAlign: 'center',
      }}>
        <div className="eyebrow" style={{ color: 'var(--danger)' }}>Error 403</div>
        <h2 style={{ fontSize: 26 }}>This page is not available to your role</h2>
        <p style={{ color: 'var(--gray-500)', fontSize: 14, maxWidth: 320 }}>
          You don't have permission to view this page. Please contact your administrator if you believe this is an error.
        </p>
        <button
          className="btn btn-secondary"
          onClick={() => window.history.back()}
        >
          Go Back
        </button>
      </div>
    );
  }

  return <>{children}</>;
};