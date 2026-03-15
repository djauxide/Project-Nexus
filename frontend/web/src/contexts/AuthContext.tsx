import React, { createContext, useContext, useState, ReactNode } from 'react';

type Role = 'VIEWER' | 'OPERATOR' | 'ENGINEER' | 'TRAINER';

interface AuthState {
  role: Role;
  userId: string;
  token: string | null;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (role: Role, userId: string, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    role: 'OPERATOR',
    userId: 'demo-user',
    token: 'demo-token',
    isAuthenticated: true, // demo mode: auto-authenticated
  });

  const login = (role: Role, userId: string, token: string) =>
    setAuth({ role, userId, token, isAuthenticated: true });

  const logout = () =>
    setAuth({ role: 'VIEWER', userId: '', token: null, isAuthenticated: false });

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
