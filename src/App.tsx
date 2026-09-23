import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CapabilityEditorProvider } from './contexts/CapabilityEditorContext';
import { RegistryProvider } from './contexts/RegistryContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ActorsPage } from './pages/Actors';
import { CapabilityDetailRoute } from './pages/CapabilityDetailRoute';
import { DashboardPage } from './pages/Dashboard';
import { EquipmentPage } from './pages/Equipment';
import { LoginPage } from './pages/Login';
import { RegisterPage } from './pages/Register';
import { VerifyEmailPage } from './pages/VerifyEmail';
import { ManageEpicsPage } from './pages/ManageEpics';
import { ManageFeaturesPage } from './pages/ManageFeatures';
import { ManageStoriesPage } from './pages/ManageStories';
import { ManageWorkItemsPage } from './pages/ManageWorkItems';
import { ProductsPage } from './pages/Products';
import { SetPasswordPage } from './pages/SetPassword';
import { SettingsIndexRedirect, SettingsLayout } from './pages/settings/SettingsLayout';
import { RolesSettingsPage } from './pages/settings/Roles';
import { UsersSettingsPage } from './pages/settings/Users';
import { StructurePage } from './pages/Structure';
import { WavesPage } from './pages/Waves';
import { ReclamationsPage } from './pages/Reclamations';

interface AppProps {
  theme?: 'dark' | 'light';
}

/** Reachable without a session (invite / reset / register / verify). */
const PUBLIC_PATHS = new Set(['/set-password', '/register', '/verify-email']);

function PublicAuthRoutes() {
  const { pathname } = useLocation();
  if (pathname === '/register') return <RegisterPage />;
  if (pathname === '/verify-email') return <VerifyEmailPage />;
  return <SetPasswordPage />;
}

function StructureRedirect({
  manage,
}: {
  manage?: 'lifecycles' | 'groups' | 'templates';
}) {
  const [params] = useSearchParams();
  const next = new URLSearchParams(params);
  next.delete('panel');
  if (manage) next.set('manage', manage);
  else next.delete('manage');
  const qs = next.toString();
  return <Navigate to={qs ? `/structure?${qs}` : '/structure'} replace />;
}

function AuthenticatedApp() {
  const { role } = useAuth();
  const visitorHome = role === 'visiteur';

  return (
    <RegistryProvider>
      <CapabilityEditorProvider>
        <AppShell>
          <Routes>
            {visitorHome ? (
              <>
                <Route path="/reclamations" element={<ReclamationsPage />} />
                <Route path="*" element={<Navigate to="/reclamations" replace />} />
              </>
            ) : (
              <>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/structure" element={<StructurePage />} />
            <Route path="/capabilities" element={<StructureRedirect />} />
            <Route path="/capabilities/:capabilityId" element={<CapabilityDetailRoute />} />
            <Route path="/capabilities/:capabilityId/epics" element={<ManageEpicsPage />} />
            <Route
              path="/capabilities/:capabilityId/epics/:epicId/features"
              element={<ManageFeaturesPage />}
            />
            <Route
              path="/capabilities/:capabilityId/epics/:epicId/features/:featureId/stories"
              element={<ManageStoriesPage />}
            />
            <Route
              path="/capabilities/:capabilityId/items/:typeId"
              element={<ManageWorkItemsPage />}
            />
            <Route path="/lifecycles" element={<StructureRedirect manage="lifecycles" />} />
            <Route path="/groups" element={<StructureRedirect manage="groups" />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/actors" element={<ActorsPage />} />
            <Route path="/equipment" element={<EquipmentPage />} />
            <Route path="/waves" element={<WavesPage />} />
            <Route path="/reclamations" element={<ReclamationsPage />} />
            <Route path="/settings" element={<SettingsLayout />}>
              <Route index element={<SettingsIndexRedirect />} />
              <Route path="users" element={<UsersSettingsPage />} />
              <Route path="roles" element={<RolesSettingsPage />} />
            </Route>
            <Route path="/users" element={<Navigate to="/settings/users" replace />} />
            <Route path="*" element={<DashboardPage />} />
              </>
            )}
          </Routes>
        </AppShell>
      </CapabilityEditorProvider>
    </RegistryProvider>
  );
}

function AuthGate() {
  const { loading, session, profile, profileMissing } = useAuth();
  const { pathname } = useLocation();

  if (PUBLIC_PATHS.has(pathname)) {
    return <PublicAuthRoutes />;
  }

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-ink-900 text-sm text-mute">
        Loading…
      </div>
    );
  }

  if (!session || !profile || profileMissing) {
    return <LoginPage />;
  }

  return <AuthenticatedApp />;
}

export function App({ theme = 'light' }: AppProps) {
  return (
    <ThemeProvider initialTheme={theme}>
      <BrowserRouter>
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
