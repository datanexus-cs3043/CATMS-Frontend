import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AuthUser, authService, UserRole } from '../services/api';
import { localDemoUser, localLogin, resetLocalDb, setSessionUser } from '../services/localDb';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isDemoMode: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginAsDemo: (role: string) => void;
  logout: () => void;
  /** Merge profile changes into the signed-in user (e.g. after editing My Profile). */
  updateUser: (changes: Partial<AuthUser>) => void;
  resetDemoData: () => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  isAdmin: boolean;
  isCashier: boolean;
  isDoctor: boolean;
  isPatient: boolean;
  isManager: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_KEY = 'demo_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const demoActiveRef = useRef(false);

  const setUser = (u: AuthUser | null) => {
    setSessionUser(u);
    setUserState(u);
  };

  const startDemoSession = (demoUser: AuthUser) => {
    demoActiveRef.current = true;
    localStorage.setItem(DEMO_KEY, JSON.stringify(demoUser));
    setUser(demoUser);
    setIsDemoMode(true);
    setIsLoading(false);
  };

  useEffect(() => {
   
    const stored = localStorage.getItem(DEMO_KEY);
    if (stored) {
      try {
        const demoUser = JSON.parse(stored) as AuthUser;
        demoActiveRef.current = true;
        setUser(demoUser);
        setIsDemoMode(true);
        setIsLoading(false);
        return; // Skip backend call entirely
      } catch {
        localStorage.removeItem(DEMO_KEY);
      }
    }

    let cancelled = false;

    authService.getMe()
      .then((userData) => {
        if (!cancelled && !demoActiveRef.current) {
          setUser(userData);
          setIsDemoMode(false);
        }
      })
      .catch(() => {
        if (!cancelled && !demoActiveRef.current) setUser(null);
      })
      .finally(() => {
        if (!cancelled && !demoActiveRef.current) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  
  const loginAsDemo = (role: string) => {
    startDemoSession(localDemoUser(role));
  };

 
  const login = async (username: string, password: string) => {
    try {
      const response = await authService.login({ username, password });
      if (response.access_token?.startsWith('local_token_')) {
       
        startDemoSession(response.user);
        return;
      }
      demoActiveRef.current = false;
      localStorage.removeItem(DEMO_KEY);
      setUser(response.user);
      setIsDemoMode(false);
    } catch (err: any) {
     
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        try {
          startDemoSession(localLogin(username, password));
          return;
        } catch { /* fall through to the original error */ }
      }
      throw err;
    }
  };
