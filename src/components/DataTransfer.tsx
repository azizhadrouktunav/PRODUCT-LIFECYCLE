import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  UploadIcon,
} from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Primitives';
import { useRegistry } from '../contexts/RegistryContext';
import type { DatasetId, ImportResult } from '../utils/datasets';
import { DATASETS } from '../utils/datasets';
import type { ParsedSheet } from '../utils/excel';
import { exportSheet, exportTemplate, readSheet } from '../utils/excel';

interface Props {
  dataset: DatasetId;
  /** Scopes epics to a capability, features to an epic, stories to a feature. */
  parentId?: string;
  /** Appended to the exported file name, e.g. the parent record id. */
  scopeLabel?: string;
  /**
   * `dropdown` — Data button with nested Export/Import (default).
   * `menuItems` — Export/Import rows only (for embedding in another menu).
   */
  mode?: 'dropdown' | 'menuItems';
  /** Called after Export/Import is chosen in menuItems mode (e.g. close parent menu). */
  onAction?: () => void;
}

const menuItemClass =
  'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium text-strong transition-colors duration-150 ease-out hover:bg-ink-700';

export function DataTransfer({
  dataset,
  parentId,
  scopeLabel,
  mode = 'dropdown',
  onAction,
}: Props) {
  const def = DATASETS[dataset];
  const { exportDataset, importDataset } = useRegistry();
  const [menuOpen, setMenuOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedSheet | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const stem = scopeLabel ? `${def.fileName}-${scopeLabel.toLowerCase()}` : def.fileName;

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  function doExport() {
    exportSheet(stem, def.sheet, def.columns, exportDataset(dataset, parentId));
  }

  function reset() {
    setParsed(null);
    setFileName('');
    setError('');
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setResult(null);
    try {
      const sheet = await readSheet(file);
      if (sheet.rows.length === 0) {
        setError('That file has no data rows below the header.');
        setParsed(null);
        return;
      }
      setFileName(file.name);
      setParsed(sheet);
    } catch {
      setError('That file could not be read. Use .xlsx, .xls or .csv.');
      setParsed(null);
    }
  }

  function confirmImport() {
    if (!parsed) return;
    setResult(importDataset(dataset, parsed.rows, parentId));
    setParsed(null);
  }

  const expected = def.columns.map((c) => c.label);
  const matched = parsed ? expected.filter((h) => parsed.headers.includes(h)) : [];
  const unknown = parsed ? parsed.headers.filter((h) => !expected.includes(h)) : [];
  const missingRequired = parsed ? !parsed.headers.includes(def.requiredColumn) : false;

  const importModal = (
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        width="max-w-lg"
        title={`Import ${def.label.toLowerCase()}`}
        subtitle={
          parentId
            ? `Rows are imported into ${scopeLabel ?? parentId}`
            : 'Rows are matched on ID — existing records are updated, new IDs are created'
        }
        footer={
          <>
            <Button variant="quiet" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button variant="primary" onClick={confirmImport} disabled={!parsed || missingRequired}>
              {parsed ? `Import ${parsed.rows.length} rows` : 'Import'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <section className="rounded-md border border-line-strong p-3">
            <div className="flex items-start gap-3">
              <FileSpreadsheetIcon className="mt-0.5 h-4 w-4 shrink-0 text-mute" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-medium text-strong">Step 1 — start from the template</h3>
                <p className="mt-1 text-2xs leading-relaxed text-mute">
                  An .xlsx file with the exact {expected.length} columns this table expects, plus one
                  example row. Optional if your file already uses these headers.
                </p>
              </div>
              <Button onClick={() => exportTemplate(def.fileName, def.sheet, def.columns)}>
                <DownloadIcon className="h-3.5 w-3.5" />
                Template
              </Button>
            </div>
          </section>

          <section className="rounded-md border border-line-strong p-3">
            <h3 className="text-xs font-medium text-strong">Step 2 — choose your Excel file</h3>
            <p className="mt-1 text-2xs leading-relaxed text-mute">
              .xlsx, .xls or .csv. The first sheet is read. Rows with an existing{' '}
              <span className="font-mono">{def.idColumn}</span> are updated; rows with a blank ID are
              added.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={onFile}
              aria-label="Choose an Excel file"
              className="mt-3 block w-full text-2xs text-mute file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-line-strong file:bg-transparent file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-soft hover:file:border-brand hover:file:text-strong"
            />
          </section>

          {error && (
            <p className="flex items-start gap-2 text-xs text-danger">
              <AlertTriangleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}

          {parsed && (
            <section className="rounded-md border border-brand/40 bg-brand/5 p-3">
              <p className="text-xs text-strong">
                {fileName} — {parsed.rows.length} rows ready
              </p>
              <dl className="mt-2 space-y-1 text-2xs text-mute">
                <div className="flex gap-2">
                  <dt className="w-28 shrink-0 text-ink-500">Matched columns</dt>
                  <dd className="text-soft">
                    {matched.length} of {expected.length}
                  </dd>
                </div>
                {unknown.length > 0 && (
                  <div className="flex gap-2">
                    <dt className="w-28 shrink-0 text-ink-500">Ignored</dt>
                    <dd>{unknown.join(', ')}</dd>
                  </div>
                )}
              </dl>
              {missingRequired && (
                <p className="mt-2 flex items-start gap-2 text-2xs text-warn">
                  <AlertTriangleIcon className="mt-0.5 h-3 w-3 shrink-0" />
                  The <span className="font-mono">{def.requiredColumn}</span> column is missing —
                  nothing can be imported from this file.
                </p>
              )}
            </section>
          )}

          {result && (
            <section className="rounded-md border border-ok/40 bg-ok/5 p-3">
              <p className="flex items-center gap-2 text-xs text-strong">
                <CheckCircle2Icon className="h-3.5 w-3.5 text-ok" />
                {result.created} created · {result.updated} updated · {result.skipped} skipped
              </p>
              {result.messages.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-2xs text-mute">
                  {result.messages.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      </Modal>
  );

  return (
    <>
      {mode === 'menuItems' ? (
        <>
          <button
            type="button"
            role="menuitem"
            className={menuItemClass}
            onClick={() => {
              onAction?.();
              doExport();
            }}
          >
            <DownloadIcon className="h-3.5 w-3.5 text-mute" />
            Export
          </button>
          <button
            type="button"
            role="menuitem"
            className={menuItemClass}
            onClick={() => {
              onAction?.();
              reset();
              setOpen(true);
            }}
          >
            <UploadIcon className="h-3.5 w-3.5 text-mute" />
            Import
          </button>
        </>
      ) : (
        <div ref={rootRef} className="relative">
          <Button onClick={() => setMenuOpen((v) => !v)}>
            <FileSpreadsheetIcon className="h-3.5 w-3.5" />
            Data
            <ChevronDownIcon className="h-3.5 w-3.5" />
          </Button>

          {menuOpen && (
            <div
              role="menu"
              className="elev absolute right-0 z-[80] mt-1.5 min-w-[160px] rounded-lg border border-line-strong bg-ink-800 p-1 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                className={menuItemClass}
                onClick={() => {
                  setMenuOpen(false);
                  doExport();
                }}
              >
                <DownloadIcon className="h-3.5 w-3.5 text-mute" />
                Export
              </button>
              <button
                type="button"
                role="menuitem"
                className={menuItemClass}
                onClick={() => {
                  setMenuOpen(false);
                  reset();
                  setOpen(true);
                }}
              >
                <UploadIcon className="h-3.5 w-3.5 text-mute" />
                Import
              </button>
            </div>
          )}
        </div>
      )}

      {createPortal(importModal, document.body)}
    </>
  );
}
