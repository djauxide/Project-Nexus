import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Multiviewer } from './views/Multiviewer';
import { Switcher } from './views/Switcher';

const queryClient = new QueryClient();

const NAV_ITEMS = [
  { path: '/multiviewer', label: 'MOSAIC' },
  { path: '/switcher',    label: 'SWITCH' },
  { path: '/scopes',      label: 'SCOPE' },
  { path: '/audio',       label: 'SHUFFLE' },
  { path: '/replay',      label: 'REPLAY' },
  { path: '/recorder',    label: 'VAULT' },
  { path: '/nmos',        label: 'CONNECT' },
  { path: '/cloud',       label: 'CLOUD' },
  { path: '/predeploy',   label: 'PRE-DEPLOY' },
];

function Placeholder({ name }: { name: string }) {
  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', color: '#0af', background: '#111', minHeight: '100vh' }}>
      <h2>{name}</h2>
      <p style={{ color: '#666' }}>Module coming soon.</p>
    </div>
  );
}

function Layout() {
  const { role } = useAuth();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0a0a' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.5rem 1rem', background: '#111', borderBottom: '1px solid #222',
      }}>
        <span style={{ color: '#0af', fontFamily: 'monospace', fontWeight: 'bold', marginRight: '1rem' }}>
          NEXUS v4
        </span>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              padding: '3px 10px', fontSize: '0.75rem', textDecoration: 'none',
              fontFamily: 'monospace', borderRadius: '2px',
              background: isActive ? '#0af' : 'transparent',
              color: isActive ? '#000' : '#888',
              border: '1px solid ' + (isActive ? '#0af' : '#333'),
            })}
          >
            {item.label}
          </NavLink>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#555', fontFamily: 'monospace' }}>
          {role}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Routes>
          <Route index element={<Navigate to="/multiviewer" replace />} />
          <Route path="/multiviewer" element={<Multiviewer />} />
          <Route path="/switcher"    element={<Switcher />} />
          <Route path="/scopes"      element={<Placeholder name="NEXUS SCOPE" />} />
          <Route path="/audio"       element={<Placeholder name="NEXUS SHUFFLE" />} />
          <Route path="/replay"      element={<Placeholder name="NEXUS REPLAY" />} />
          <Route path="/recorder"    element={<Placeholder name="NEXUS VAULT" />} />
          <Route path="/nmos"        element={<Placeholder name="NEXUS CONNECT (NMOS)" />} />
          <Route path="/cloud"       element={<Placeholder name="NEXUS CLOUD" />} />
          <Route path="/predeploy"   element={<Placeholder name="PRE-DEPLOY Checklist" />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Layout />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
