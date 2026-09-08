import React from 'react';
import { Modal } from './Modal';

export interface DetailRow {
  label: string;
  value: React.ReactNode;
}

export function DetailsModal({
  open,
  onClose,
  title,
  subtitle,
  rows






}: {open: boolean;onClose: () => void;title: string;subtitle?: string;rows: DetailRow[];}) {
  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={subtitle}>
      <dl>
        {rows.map((r) =>
        <div
          key={r.label}
          className="grid grid-cols-[150px_minmax(0,1fr)] items-start gap-4 border-b border-line-soft py-3 last:border-0">
          
            <dt className="text-2xs uppercase tracking-[0.14em] text-ink-500">{r.label}</dt>
            <dd className="min-w-0 text-sm leading-relaxed text-soft">{r.value}</dd>
          </div>
        )}
      </dl>
    </Modal>);

}