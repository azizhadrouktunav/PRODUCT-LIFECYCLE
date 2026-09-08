import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { XIcon } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export function Modal({ open, onClose, title, subtitle, children, footer, width = 'max-w-2xl' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open &&
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
          <motion.div
          className="scrim fixed inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
          onClick={onClose} />
        
          <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={`elev relative w-full ${width} rounded-xl border border-line-strong bg-ink-800`}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.985 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}>
          
            <div className="flex items-start justify-between gap-6 border-b border-line px-6 py-4">
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-strong">{title}</h2>
                {subtitle && <p className="mt-1 text-xs text-mute">{subtitle}</p>}
              </div>
              <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1 rounded p-1 text-mute transition-colors duration-150 ease-out hover:text-strong">
              
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="scroll-thin max-h-[65vh] overflow-y-auto px-6 py-5">{children}</div>
            {footer &&
          <div className="flex items-center justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>
          }
          </motion.div>
        </div>
      }
    </AnimatePresence>);

}