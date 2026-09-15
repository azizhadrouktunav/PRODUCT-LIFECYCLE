import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CapabilityEditorProvider } from './contexts/CapabilityEditorContext';
import { RegistryProvider } from './contexts/RegistryContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ActorsPage } from './pages/Actors';
import { CapabilitiesPage } from './pages/Capabilities';
import { CapabilityDetailRoute } from './pages/CapabilityDetailRoute';
import { EquipmentPage } from './pages/Equipment';
import { GroupsPage } from './pages/Groups';
import { LifecyclesPage } from './pages/Lifecycles';
import { LoginPage } from './pages/Login';
import { ManageEpicsPage } from './pages/ManageEpics';
import { ManageFeaturesPage } from './pages/ManageFeatures';
import { ManageStoriesPage } from './pages/ManageStories';
import { ProductsPage } from './pages/Products';
import { UsersPage } from './pages/Users';
import { WavesPage } from './pages/Waves';

interface AppProps {
  theme?: 'dark' | 'light';
}

function AuthenticatedApp() {
  return (
    <RegistryProvider>
      <BrowserRouter>
        <CapabilityEditorProvider>
          <AppShell>
            <Routes>
              <Route path="/" element={<CapabilitiesPage />} />
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
              <Route path="/lifecycles" element={<LifecyclesPage />} />
              <Route path="/groups" element={<GroupsPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/actors" element={<ActorsPage />} />
              <Route path="/equipment" element={<EquipmentPage />} />
              <Route path="/waves" element={<WavesPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="*" element={<CapabilitiesPage />} />
            </Routes>
          </AppShell>
        </CapabilityEditorProvider>
      </BrowserRouter>
    </RegistryProvider>
  );
}

function AuthGate() {
  const { loading, session, profile, profileMissing } = useAuth();

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
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </ThemeProvider>
  );
}
