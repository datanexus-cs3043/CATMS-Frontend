import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AuthUser, authService, UserRole } from '../services/api';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  /** Merge profile changes into the signed-in user (e.g. after editing My Profile). */
  updateUser: (changes: Partial<AuthUser>) => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  isAdmin: boolean;
  isCashier: boolean;
  isDoctor: boolean;
  isPatient: boolean;
  isManager: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // A late session lookup must not overwrite a newer login or logout.
  const sessionVersion = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const version = sessionVersion.current;

    authService.getMe()
      .then((userData) => {
        if (!cancelled && sessionVersion.current === version) {
          setUser(userData);
        }
      })
      .catch(() => {
        if (!cancelled && sessionVersion.current === version) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const login = async (username: string, password: string) => {
    const response = await authService.login({ username, password });
    sessionVersion.current += 1;
    setUser(response.user);
  };

  // ── Logout ──
  const logout = () => {
    sessionVersion.current += 1;
    setUser(null);
    authService.logout().catch(() => {});
  };

  const updateUser = (changes: Partial<AuthUser>) => {
    if (!user) return;
    const next = { ...user, ...changes };
    sessionVersion.current += 1;
    setUser(next);
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    const roleList = Array.isArray(roles) ? roles : [roles];
    return roleList.includes(user.role as UserRole);
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role as UserRole);
  };

  const isAdmin    = user?.role === 'admin' || user?.role === 'branch_manager';
  const isCashier  = user?.role === 'receptionist_cashier';
  const isDoctor   = user?.role === 'doctor';
  const isPatient  = user?.role === 'patient';
  const isManager  = user?.role === 'branch_manager';

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      updateUser,
      hasRole,
      hasAnyRole,
      isAdmin,
      isCashier,
      isDoctor,
      isPatient,
      isManager,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
