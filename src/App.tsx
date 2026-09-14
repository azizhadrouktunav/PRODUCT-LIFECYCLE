import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { CapabilityEditorProvider } from './contexts/CapabilityEditorContext';
import { RegistryProvider } from './contexts/RegistryContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ActorsPage } from './pages/Actors';
import { CapabilitiesPage } from './pages/Capabilities';
import { CapabilityDetailRoute } from './pages/CapabilityDetailRoute';
import { EquipmentPage } from './pages/Equipment';
import { GroupsPage } from './pages/Groups';
import { LifecyclesPage } from './pages/Lifecycles';
import { ManageEpicsPage } from './pages/ManageEpics';
import { ManageFeaturesPage } from './pages/ManageFeatures';
import { ManageStoriesPage } from './pages/ManageStories';
import { ProductsPage } from './pages/Products';
import { WavesPage } from './pages/Waves';

interface AppProps {
  theme?: 'dark' | 'light';
}

export function App({ theme = 'light' }: AppProps) {
  return (
    <ThemeProvider initialTheme={theme}>
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
                  element={<ManageFeaturesPage />} />
                
                <Route
                  path="/capabilities/:capabilityId/epics/:epicId/features/:featureId/stories"
                  element={<ManageStoriesPage />} />
                
                <Route path="/lifecycles" element={<LifecyclesPage />} />
                <Route path="/groups" element={<GroupsPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/actors" element={<ActorsPage />} />
                <Route path="/equipment" element={<EquipmentPage />} />
                <Route path="/waves" element={<WavesPage />} />
                <Route path="*" element={<CapabilitiesPage />} />
              </Routes>
            </AppShell>
          </CapabilityEditorProvider>
        </BrowserRouter>
      </RegistryProvider>
    </ThemeProvider>);

}