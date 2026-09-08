import React from 'react';
import type { CapabilityStatus, StageTone, TrackId, WaveState } from '../types/registry';
import { stageDef, storyStageDef } from '../types/registry';

export const TONE_DOT: Record<StageTone, string> = {
  blue: 'bg-brand',
  cyan: 'bg-aqua',
  amber: 'bg-warn',
  orange: 'bg-orange',
  green: 'bg-ok',
  red: 'bg-danger',
  violet: 'bg-violet',
  pink: 'bg-pink',
  gray: 'bg-mute'
};

export const TONE_TEXT: Record<StageTone, string> = {
  blue: 'text-brand-bright',
  cyan: 'text-aqua',
  amber: 'text-warn',
  orange: 'text-orange',
  green: 'text-ok',
  red: 'text-danger',
  violet: 'text-violet',
  pink: 'text-pink',
  gray: 'text-mute'
};

export function StagePill({ track, stage }: {track: TrackId;stage: string;}) {
  const def = stageDef(track, stage);
  const tone: StageTone = def?.tone ?? 'gray';
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-xs text-soft" title={def?.description}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[tone]}`} aria-hidden="true" />
      {stage}
    </span>);

}

const STATUS_TONE: Record<CapabilityStatus, string> = {
  'On Hold': 'border-warn/40 text-warn',
  'In Progress': 'border-brand/40 text-brand-bright',
  Approved: 'border-ok/40 text-ok',
  Blocked: 'border-danger/40 text-danger',
  'Needs Review': 'border-aqua/40 text-aqua',
  Rejected: 'border-line-strong text-mute line-through',
  Completed: 'border-ok/40 text-ok'
};

export function StatusTag({ status }: {status: CapabilityStatus | null;}) {
  if (!status) return <span className="text-xs text-ink-500">—</span>;
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded border px-1.5 py-0.5 text-2xs font-medium ${STATUS_TONE[status]}`}>
      
      {status}
    </span>);

}

export function StoryStagePill({ stage }: {stage: string;}) {
  const def = storyStageDef(stage);
  const tone: StageTone = def?.tone ?? 'gray';
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded border border-line-strong px-1.5 py-0.5 text-2xs font-medium ${TONE_TEXT[tone]}`}
      title={def?.description}>
      
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[tone]}`} aria-hidden="true" />
      {stage}
    </span>);

}

const WAVE_TONE: Record<WaveState, string> = {
  Planned: 'border-line-strong text-soft',
  'In Test': 'border-violet/40 text-violet',
  'On Prod': 'border-ok/40 text-ok',
  Closed: 'border-line-strong text-mute'
};

export function WaveTag({ state }: {state: WaveState;}) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded border px-1.5 py-0.5 text-2xs font-medium ${WAVE_TONE[state]}`}>
      
      {state}
    </span>);

}

export function Chip({
  children,
  tone = 'neutral',
  title




}: {children: React.ReactNode;tone?: 'neutral' | 'brand' | 'aqua' | 'violet';title?: string;}) {
  const tones = {
    neutral: 'border-line-strong text-soft',
    brand: 'border-brand/40 text-brand-bright',
    aqua: 'border-aqua/40 text-aqua',
    violet: 'border-violet/40 text-violet'
  };
  return (
    <span
      title={title}
      className={`inline-flex max-w-full items-center truncate rounded border px-1.5 py-0.5 font-mono text-2xs ${tones[tone]}`}>
      
      {children}
    </span>);

}

export function Button({
  children,
  onClick,
  variant = 'ghost',
  type = 'button',
  disabled,
  className = ''







}: {children: React.ReactNode;onClick?: () => void;variant?: 'primary' | 'ghost' | 'quiet';type?: 'button' | 'submit';disabled?: boolean;className?: string;}) {
  const variants = {
    primary:
    'bg-brand text-white hover:bg-brand-bright border border-transparent disabled:bg-ink-600 disabled:text-mute',
    ghost: 'border border-line-strong text-soft hover:border-brand hover:text-strong',
    quiet: 'border border-transparent text-mute hover:text-strong'
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150 ease-out disabled:cursor-not-allowed ${variants[variant]} ${className}`}>
      
      {children}
    </button>);

}

export function ProgressBar({ done, total }: {done: number;total: number;}) {
  const pct = total === 0 ? 0 : Math.round(done / total * 100);
  return (
    <span className="flex items-center gap-2">
      <span className="h-1 w-24 overflow-hidden rounded-full bg-ink-600">
        <span
          className="block h-full rounded-full bg-brand"
          style={{ width: `${pct}%` }}
          aria-hidden="true" />
        
      </span>
      <span className="font-mono text-2xs text-mute">
        {done}/{total}
      </span>
    </span>);

}

export function PageHeader({
  title,
  count,
  description,
  action





}: {title: string;count?: string;description: string;action?: React.ReactNode;}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
      <div className="max-w-2xl">
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-semibold tracking-tight text-strong">{title}</h1>
          {count && <span className="font-mono text-xs text-mute">{count}</span>}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-mute">{description}</p>
      </div>
      {action}
    </header>);

}

export function Field({
  label,
  hint,
  children,
  required





}: {label: string;hint?: string;children: React.ReactNode;required?: boolean;}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline gap-2 text-xs font-medium text-soft">
        {label}
        {required && <span className="text-brand-bright">*</span>}
        {hint && <span className="font-normal text-mute">{hint}</span>}
      </span>
      {children}
    </label>);

}

export const inputClass =
'w-full rounded-md border border-line-strong bg-ink-800 px-3 py-2 text-sm text-strong placeholder:text-ink-500 transition-colors duration-150 ease-out focus:border-brand focus:outline-none';