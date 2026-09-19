import React, { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CapabilityFormModal } from '../components/CapabilityFormModal';
import { useRegistry } from './RegistryContext';

export type CreateCapabilityOpts = { groupId?: string };

interface EditorValue {
  openCreate: (opts?: CreateCapabilityOpts) => void;
  openEdit: (capabilityId: string) => void;
}

const CapabilityEditorContext = createContext<EditorValue | null>(null);

export function CapabilityEditorProvider({ children }: { children: React.ReactNode }) {
  const { getCapability } = useRegistry();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [defaultGroupId, setDefaultGroupId] = useState<string | undefined>();

  const value: EditorValue = {
    openCreate: (opts) => {
      setEditingId(null);
      setDefaultGroupId(opts?.groupId);
      setOpen(true);
    },
    openEdit: (capabilityId: string) => {
      setEditingId(capabilityId);
      setDefaultGroupId(undefined);
      setOpen(true);
    },
  };

  return (
    <CapabilityEditorContext.Provider value={value}>
      {children}
      <CapabilityFormModal
        open={open}
        capability={editingId ? (getCapability(editingId) ?? null) : null}
        defaultGroupId={defaultGroupId}
        onClose={() => {
          setOpen(false);
          setEditingId(null);
          setDefaultGroupId(undefined);
        }}
        onCreated={(created) => navigate(`/capabilities/${created.id}`)}
      />
    </CapabilityEditorContext.Provider>
  );
}

export function useCapabilityEditor(): EditorValue {
  const ctx = useContext(CapabilityEditorContext);
  if (!ctx) throw new Error('useCapabilityEditor must be used within a CapabilityEditorProvider');
  return ctx;
}
