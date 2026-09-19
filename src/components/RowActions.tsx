import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LayersIcon,
  ListTreeIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRegistry } from '../contexts/RegistryContext';
import type { Capability, CapabilityStatus } from '../types/registry';
import { MANUAL_CAPABILITY_STATUSES, isAutoManagedStatus, usesEquipment, usesDecomposition } from '../types/registry';

type Panel = 'root' | 'status';

interface Props {
  capability: Capability;
  onEdit: (capabilityId: string) => void;
}

type MenuCoords = { top?: number; bottom?: number; right: number };

const MENU_ESTIMATE = 280;
const MENU_GAP = 6;

function placeMenu(btn: DOMRect, menuHeight = MENU_ESTIMATE): MenuCoords {
  const right = Math.max(12, window.innerWidth - btn.right);
  const spaceBelow = window.innerHeight - btn.bottom - MENU_GAP;
  const openAbove = spaceBelow < menuHeight && btn.top > spaceBelow;
  if (openAbove) {
    return { bottom: window.innerHeight - btn.top + MENU_GAP, right };
  }
  return { top: btn.bottom + MENU_GAP, right };
}

export function RowActions({ capability, onEdit }: Props) {
  const { updateCapability, removeCapability, countsOf, lifecycleOf } = useRegistry();
  const { can, isReadOnly } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>('root');
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const counts = countsOf(capability.id);
  const lifecycle = lifecycleOf(capability);
  const isHardware = usesEquipment(lifecycle);
  const canDecompose = usesDecomposition(lifecycle);
  const canEdit = can('edit_capability') && !isReadOnly;
  const canDelete = can('delete_capability') && !isReadOnly;
  const canStatus =
    (can('edit_capability') || can('edit_capability_progress') || can('edit_all')) && !isReadOnly;

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setCoords(placeMenu(r));
  }, [open, panel]);

  useLayoutEffect(() => {
    if (!open || !btnRef.current || !menuRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const h = menuRef.current.getBoundingClientRect().height;
    setCoords(placeMenu(r, h || MENU_ESTIMATE));
  }, [open, panel]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  function toggleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    setPanel('root');
    setOpen((v) => !v);
  }

  function setStatus(status: CapabilityStatus | null) {
    if (!canStatus) return;
    updateCapability(capability.id, { status });
    setOpen(false);
  }

  const itemClass =
    'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium text-strong transition-colors duration-150 ease-out hover:bg-ink-700';

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggleOpen}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${capability.name}`}
        className={`inline-flex rounded p-1 transition-colors duration-150 ease-out hover:bg-ink-700 hover:text-strong ${
          open ? 'bg-ink-700 text-strong' : 'text-mute'
        }`}
      >
        <MoreHorizontalIcon className="h-4 w-4" />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && coords && (
            <motion.div
              ref={menuRef}
              role="menu"
              onClick={(e) => e.stopPropagation()}
              style={{
                top: coords.top,
                bottom: coords.bottom,
                right: coords.right,
              }}
              initial={{ opacity: 0, y: coords.bottom != null ? 4 : -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: coords.bottom != null ? 2 : -2, scale: 0.99 }}
              transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
              className="elev scroll-thin fixed z-[80] max-h-[60vh] w-72 overflow-y-auto rounded-lg border border-line-strong bg-ink-800 p-1.5 shadow-lg ring-1 ring-black/5"
            >
              {panel === 'root' && (
                <>
                  <p className="px-2.5 pb-1.5 pt-1.5 font-mono text-2xs font-medium text-soft">
                    {capability.id} · {lifecycle.label}
                  </p>
                  <p className="px-2.5 pb-2 text-2xs text-mute">
                    Progress is automatic from lifecycle evidence · {capability.progress}
                  </p>
                  <button
                    type="button"
                    className={itemClass}
                    onClick={() => {
                      setOpen(false);
                      navigate(`/capabilities/${capability.id}`);
                    }}
                  >
                    <ListTreeIcon className="h-3.5 w-3.5 shrink-0 text-mute" />
                    {isHardware ? 'Open capability' : 'Open breakdown'}
                    <span className="ml-auto font-mono text-2xs font-normal text-mute">
                      {isHardware
                        ? `${counts.equipment} equip.`
                        : `${counts.epics}E · ${counts.features}F · ${counts.stories}S`}
                    </span>
                  </button>
                  {canDecompose && (
                    <button
                      type="button"
                      className={itemClass}
                      onClick={() => {
                        setOpen(false);
                        navigate(`/capabilities/${capability.id}/epics`);
                      }}
                    >
                      <LayersIcon className="h-3.5 w-3.5 shrink-0 text-mute" />
                      Manage Epics
                      <span className="ml-auto font-mono text-2xs font-normal text-mute">
                        {counts.epics}
                      </span>
                    </button>
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      className={itemClass}
                      onClick={() => {
                        setOpen(false);
                        onEdit(capability.id);
                      }}
                    >
                      <PencilIcon className="h-3.5 w-3.5 shrink-0 text-mute" />
                      Edit capability
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      className={`${itemClass} text-danger hover:bg-danger/10 hover:text-danger`}
                      onClick={() => {
                        setOpen(false);
                        removeCapability(capability.id);
                      }}
                    >
                      <Trash2Icon className="h-3.5 w-3.5 shrink-0" />
                      Delete capability
                    </button>
                  )}
                  {canStatus && (
                    <button type="button" className={itemClass} onClick={() => setPanel('status')}>
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-aqua" aria-hidden="true" />
                      Flag status
                      <span className="ml-auto flex items-center gap-1 text-2xs font-normal text-mute">
                        {capability.status ?? 'No flag'}
                        <ChevronRightIcon className="h-3 w-3" />
                      </span>
                    </button>
                  )}
                </>
              )}

              {panel === 'status' && (
                <>
                  <button
                    type="button"
                    onClick={() => setPanel('root')}
                    className="mb-1 flex w-full items-center gap-1.5 border-b border-line px-2.5 pb-2 pt-1.5 text-2xs font-medium uppercase tracking-[0.14em] text-soft transition-colors duration-150 ease-out hover:text-strong"
                  >
                    <ChevronLeftIcon className="h-3 w-3" />
                    Flag status
                  </button>
                  <p className="px-2.5 pb-1.5 text-2xs text-mute">
                    On Hold / Needs Review pause auto status. No flag resumes lifecycle-driven status.
                  </p>
                  <button type="button" className={itemClass} onClick={() => setStatus(null)}>
                    No flag (auto)
                    {isAutoManagedStatus(capability.status) && (
                      <CheckIcon className="ml-auto h-3.5 w-3.5 text-brand-bright" />
                    )}
                  </button>
                  {MANUAL_CAPABILITY_STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={itemClass}
                      onClick={() => setStatus(s)}
                    >
                      {s}
                      {capability.status === s && (
                        <CheckIcon className="ml-auto h-3.5 w-3.5 text-brand-bright" />
                      )}
                    </button>
                  ))}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
