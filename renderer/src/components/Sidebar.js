import React from 'react';
import { NavLink } from 'react-router-dom';
import { Zap, Clock, Settings as SettingsIcon, AlertCircle } from 'lucide-react';
import { Badge } from './ui/badge';

export function Sidebar({ agentStatus, updateAvailable }) {
  const navItems = [
    { path: '/', icon: Zap, label: 'Workbench' },
    { path: '/runs', icon: Clock, label: 'Runs' },
    { path: '/settings', icon: SettingsIcon, label: 'Settings' },
  ];

  return (
    <aside
      className="glass"
      style={{
        width: '240px',
        padding: '1.5rem',
        borderRight: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Logo/Title */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          <span style={{ color: '#ff5a78' }}>Rina</span>
          <span style={{ color: '#4dd4d4' }}>Warp</span>
        </h2>
        <p style={{ fontSize: '0.75rem', color: '#666' }}>Terminal Pro</p>
      </div>

      {/* Agent Status Badge */}
      {agentStatus && (
        <div style={{ marginBottom: '1.5rem', padding: '0.75rem', background: 'rgba(77, 212, 212, 0.1)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: agentStatus.available ? '#4dd4d4' : '#666',
                marginRight: '0.5rem',
              }}
            />
            <span style={{ fontSize: '0.8rem', color: '#4dd4d4', fontWeight: 500 }}>
              Agent {agentStatus.available ? 'Ready' : 'Offline'}
            </span>
          </div>
          {agentStatus.activeRuns > 0 && (
            <div style={{ fontSize: '0.75rem', color: '#aaa', paddingLeft: '0.875rem' }}>
              {agentStatus.activeRuns} active
            </div>
          )}
        </div>
      )}

      {/* Update Notice */}
      {updateAvailable && (
        <div style={{ marginBottom: '1.5rem', padding: '0.75rem', background: 'rgba(255, 90, 120, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
          <AlertCircle size={16} style={{ color: '#ff5a78', marginRight: '0.5rem', flexShrink: 0 }} />
          <span style={{ fontSize: '0.8rem', color: '#ff5a78' }}>Update available</span>
        </div>
      )}

      {/* Navigation */}
      <nav style={{ flex: 1 }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              padding: '0.75rem 1rem',
              marginBottom: '0.5rem',
              borderRadius: '8px',
              textDecoration: 'none',
              color: isActive ? '#e5e5e5' : '#888',
              background: isActive ? 'rgba(77, 212, 212, 0.1)' : 'transparent',
              border: isActive ? '1px solid rgba(77, 212, 212, 0.3)' : '1px solid transparent',
              fontWeight: 500,
              fontSize: '0.9rem',
              transition: 'all 0.2s',
            })}
          >
            <item.icon size={18} style={{ marginRight: '0.75rem' }} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <p style={{ fontSize: '0.75rem', color: '#666', textAlign: 'center' }}>
          v0.1.0
        </p>
      </div>
    </aside>
  );
}
