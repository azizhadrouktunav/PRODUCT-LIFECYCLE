import React from 'react';
import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/Primitives';

const TABS = [
  { to: '/settings/users', label: 'Users', end: true },
  { to: '/settings/roles', label: 'Roles', end: true },
];

export function SettingsLayout() {
  const { can } = useAuth();

  if (!can('manage_users')) {
    return (
      <div className="py-16 text-center text-sm text-mute">
        Only users with Manage users & roles permission can open Settings.
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage users, roles, and permissions for this workspace."
      />
      <nav className="mt-4 flex gap-1 border-b border-line">
        {TABS.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `border-b-2 px-3 py-2 text-sm transition-colors duration-150 ease-out ${
                isActive
                  ? 'border-brand text-strong'
                  : 'border-transparent text-mute hover:text-strong'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
}

export function SettingsIndexRedirect() {
  return <Navigate to="/settings/users" replace />;
}
