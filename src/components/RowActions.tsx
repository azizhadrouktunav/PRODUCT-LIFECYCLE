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
import { TONE_DOT } from './Primitives';
import { useRegistry } from '../contexts/RegistryContext';
import type { Capability, CapabilityStatus } from '../types/registry';
import {
  CAPABILITY_STATUSES,
  REQUIREMENT_LABEL,
  meetsRequirement,
  usesEquipment,
  usesDecomposition,
} from '../types/registry';

type Panel = 'root' | 'progress' | 'status';

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

  function setProgress(stage: string) {
    updateCapability(capability.id, { progress: stage });
    setOpen(false);
  }

  function setStatus(status: CapabilityStatus | null) {
    updateCapability(capability.id, { status });
    setOpen(false);
  }

  const itemClass =
    'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium text-strong transition-colors duration-150 ease-out hover:bg-ink-700';
  const lockedClass =
    'flex w-full cursor-not-allowed items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-mute';

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
                  <button type="button" className={itemClass} onClick={() => setPanel('progress')}>
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                    Change progress
                    <span className="ml-auto flex items-center gap-1 truncate text-2xs font-normal text-mute">
                      {capability.progress}
                      <ChevronRightIcon className="h-3 w-3 shrink-0" />
                    </span>
                  </button>
                  <button type="button" className={itemClass} onClick={() => setPanel('status')}>
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-aqua" aria-hidden="true" />
                    Change status
                    <span className="ml-auto flex items-center gap-1 text-2xs font-normal text-mute">
                      {capability.status ?? 'None'}
                      <ChevronRightIcon className="h-3 w-3" />
                    </span>
                  </button>
                </>
              )}

              {panel !== 'root' && (
                <>
                  <button
                    type="button"
                    onClick={() => setPanel('root')}
                    className="mb-1 flex w-full items-center gap-1.5 border-b border-line px-2.5 pb-2 pt-1.5 text-2xs font-medium uppercase tracking-[0.14em] text-soft transition-colors duration-150 ease-out hover:text-strong"
                  >
                    <ChevronLeftIcon className="h-3 w-3" />
                    {panel === 'progress' ? lifecycle.label : 'Status'}
                  </button>

                  {panel === 'progress' &&
                    lifecycle.stages.map((s, i) => {
                      const met = meetsRequirement(s.requirement, counts);
                      const current = capability.progress === s.name;
                      return met ? (
                        <button
                          key={s.name}
                          type="button"
                          className={itemClass}
                          title={s.description}
                          onClick={() => setProgress(s.name)}
                        >
                          <span className="w-4 shrink-0 font-mono text-2xs font-normal text-mute">
                            {i + 1}
                          </span>
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[s.tone]}`}
                            aria-hidden="true"
                          />
                          <span className="truncate">{s.name}</span>
                          {current && (
                            <CheckIcon className="ml-auto h-3.5 w-3.5 shrink-0 text-brand-bright" />
                          )}
                        </button>
                      ) : (
                        <span
                          key={s.name}
                          className={lockedClass}
                          title={`Locked — ${REQUIREMENT_LABEL[s.requirement]}`}
                        >
                          <span className="w-4 shrink-0 font-mono text-2xs">{i + 1}</span>
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink-600"
                            aria-hidden="true"
                          />
                          <span className="truncate">{s.name}</span>
                          {current && <span className="ml-auto text-2xs text-warn">current</span>}
                        </span>
                      );
                    })}

                  {panel === 'status' && (
                    <>
                      <button type="button" className={itemClass} onClick={() => setStatus(null)}>
                        No flag
                        {capability.status === null && (
                          <CheckIcon className="ml-auto h-3.5 w-3.5 text-brand-bright" />
                        )}
                      </button>
                      {CAPABILITY_STATUSES.map((s) => (
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
