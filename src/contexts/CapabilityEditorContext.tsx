import React, { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CapabilityFormModal } from '../components/CapabilityFormModal';
import { useRegistry } from './RegistryContext';

interface EditorValue {
  openCreate: () => void;
  openEdit: (capabilityId: string) => void;
}

const CapabilityEditorContext = createContext<EditorValue | null>(null);

export function CapabilityEditorProvider({ children }: {children: React.ReactNode;}) {
  const { getCapability } = useRegistry();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const value: EditorValue = {
    openCreate: () => {
      setEditingId(null);
      setOpen(true);
    },
    openEdit: (capabilityId: string) => {
      setEditingId(capabilityId);
      setOpen(true);
    }
  };

  return (
    <CapabilityEditorContext.Provider value={value}>
      {children}
      <CapabilityFormModal
        open={open}
        capability={editingId ? getCapability(editingId) ?? null : null}
        onClose={() => {
          setOpen(false);
          setEditingId(null);
        }}
        onCreated={(created) => navigate(`/capabilities/${created.id}`)} />
      
    </CapabilityEditorContext.Provider>);

}

export function useCapabilityEditor(): EditorValue {
  const ctx = useContext(CapabilityEditorContext);
  if (!ctx) throw new Error('useCapabilityEditor must be used within a CapabilityEditorProvider');
  return ctx;
}