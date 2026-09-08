import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from 'lucide-react';

export interface ActionItem {
  label: string;
  icon?: React.ComponentType<{className?: string;}>;
  onSelect: () => void;
  danger?: boolean;
}

export interface ActionSubmenu {
  key: string;
  label: string;
  icon?: React.ComponentType<{className?: string;}>;
  current: string | null;
  options: string[];
  noneLabel?: string;
  onSelect: (value: string | null) => void;
}

export function ActionMenu({
  label,
  header,
  items,
  submenus = []





}: {label: string;header?: string;items: ActionItem[];submenus?: ActionSubmenu[];}) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<string>('root');
  const [coords, setCoords] = useState<{top: number;right: number;} | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setCoords({ top: r.bottom + 6, right: Math.max(12, window.innerWidth - r.right) });
  }, [open]);

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

  const itemClass =
  'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-soft transition-colors duration-150 ease-out hover:bg-ink-700 hover:text-strong';
  const active = submenus.find((s) => s.key === panel);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation();
          setPanel('root');
          setOpen((v) => !v);
        }}
        className={`inline-flex rounded p-1 transition-colors duration-150 ease-out hover:bg-ink-700 hover:text-strong ${
        open ? 'bg-ink-700 text-strong' : 'text-mute'}`
        }>
        
        <MoreHorizontalIcon className="h-4 w-4" />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && coords &&
          <motion.div
            ref={menuRef}
            role="menu"
            onClick={(e) => e.stopPropagation()}
            style={{ top: coords.top, right: coords.right }}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -2, scale: 0.99 }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            className="elev scroll-thin fixed z-[60] max-h-[60vh] w-60 overflow-y-auto rounded-lg border border-line-strong bg-ink-800 p-1.5">
            
              {panel === 'root' ?
            <>
                  {header && <p className="px-2 pb-1 pt-1 font-mono text-2xs text-ink-500">{header}</p>}
                  {items.map((item) =>
              <button
                key={item.label}
                type="button"
                className={`${itemClass} ${item.danger ? 'hover:text-danger' : ''}`}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}>
                
                      {item.icon && <item.icon className="h-3.5 w-3.5" />}
                      {item.label}
                    </button>
              )}
                  {submenus.map((s) =>
              <button key={s.key} type="button" className={itemClass} onClick={() => setPanel(s.key)}>
                      {s.icon && <s.icon className="h-3.5 w-3.5" />}
                      {s.label}
                      <span className="ml-auto flex items-center gap-1 truncate text-2xs text-mute">
                        {s.current ?? s.noneLabel ?? 'None'}
                        <ChevronRightIcon className="h-3 w-3 shrink-0" />
                      </span>
                    </button>
              )}
                </> :

            active &&
            <>
                    <button
                type="button"
                onClick={() => setPanel('root')}
                className="mb-1 flex w-full items-center gap-1.5 border-b border-line px-2 pb-1.5 pt-1 text-2xs uppercase tracking-[0.14em] text-ink-500 transition-colors duration-150 ease-out hover:text-strong">
                
                      <ChevronLeftIcon className="h-3 w-3" />
                      {active.label}
                    </button>
                    {active.noneLabel &&
              <button
                type="button"
                className={itemClass}
                onClick={() => {
                  active.onSelect(null);
                  setOpen(false);
                }}>
                
                        {active.noneLabel}
                        {active.current === null &&
                <CheckIcon className="ml-auto h-3.5 w-3.5 text-brand-bright" />
                }
                      </button>
              }
                    {active.options.map((o) =>
              <button
                key={o}
                type="button"
                className={itemClass}
                onClick={() => {
                  active.onSelect(o);
                  setOpen(false);
                }}>
                
                        <span className="truncate">{o}</span>
                        {active.current === o &&
                <CheckIcon className="ml-auto h-3.5 w-3.5 shrink-0 text-brand-bright" />
                }
                      </button>
              )}
                  </>

            }
            </motion.div>
          }
        </AnimatePresence>,
        document.body
      )}
    </>);

}