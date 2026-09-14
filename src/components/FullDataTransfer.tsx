import React, { useRef, useState } from 'react';
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  DownloadIcon,
  FileSpreadsheetIcon,
  UploadIcon,
} from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Primitives';
import { useRegistry } from '../contexts/RegistryContext';
import type { ImportResult } from '../utils/datasets';
import { DATASETS, DELIVERY_PACK } from '../utils/datasets';
import type { ParsedSheet, SheetRow } from '../utils/excel';
import { exportWorkbook, exportWorkbookTemplate, readWorkbook } from '../utils/excel';

const PACK_SHEETS = DELIVERY_PACK.map((id) => DATASETS[id].sheet);

export function FullDataTransfer() {
  const { exportDeliveryPack, importDeliveryPack } = useRegistry();
  const [open, setOpen] = useState(false);
  const [workbook, setWorkbook] = useState<Record<string, ParsedSheet> | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function doExport() {
    const pack = exportDeliveryPack();
    exportWorkbook(
      'delivery-pack',
      pack.map(({ dataset, rows }) => ({
        name: DATASETS[dataset].sheet,
        columns: DATASETS[dataset].columns,
        rows,
      }))
    );
  }

  function doTemplate() {
    exportWorkbookTemplate(
      'delivery-pack',
      DELIVERY_PACK.map((id) => ({
        name: DATASETS[id].sheet,
        columns: DATASETS[id].columns,
      }))
    );
  }

  function reset() {
    setWorkbook(null);
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
      const sheets = await readWorkbook(file);
      const found = PACK_SHEETS.filter((name) => (sheets[name]?.rows.length ?? 0) > 0);
      if (found.length === 0) {
        setError(
          `No matching feuilles found. Expected one or more of: ${PACK_SHEETS.join(', ')}.`
        );
        setWorkbook(null);
        return;
      }
      setFileName(file.name);
      setWorkbook(sheets);
    } catch {
      setError('That file could not be read. Use .xlsx or .xls.');
      setWorkbook(null);
    }
  }

  function confirmImport() {
    if (!workbook) return;
    const payload: Partial<Record<string, SheetRow[]>> = {};
    PACK_SHEETS.forEach((name) => {
      if (workbook[name]?.rows.length) payload[name] = workbook[name].rows;
    });
    setResult(importDeliveryPack(payload));
    setWorkbook(null);
  }

  const foundSheets = workbook
    ? PACK_SHEETS.filter((name) => (workbook[name]?.rows.length ?? 0) > 0)
    : [];
  const missingSheets = workbook ? PACK_SHEETS.filter((name) => !foundSheets.includes(name)) : [];
  const totalRows = foundSheets.reduce(
    (sum, name) => sum + (workbook?.[name]?.rows.length ?? 0),
    0
  );

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Button onClick={doExport}>
          <DownloadIcon className="h-3.5 w-3.5" />
          Export all
        </Button>
        <Button
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          <UploadIcon className="h-3.5 w-3.5" />
          Import all
        </Button>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        width="max-w-lg"
        title="Import delivery pack"
        subtitle="One workbook with Capabilities, Epics, Features and User Stories feuilles. Existing IDs are updated; blank IDs are created."
        footer={
          <>
            <Button variant="quiet" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button variant="primary" onClick={confirmImport} disabled={!workbook || totalRows === 0}>
              {workbook ? `Import ${totalRows} rows` : 'Import'}
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
                  An .xlsx with four feuilles ({PACK_SHEETS.join(', ')}), each with the expected
                  columns and one example row.
                </p>
              </div>
              <Button onClick={doTemplate}>
                <DownloadIcon className="h-3.5 w-3.5" />
                Template
              </Button>
            </div>
          </section>

          <section className="rounded-md border border-line-strong p-3">
            <h3 className="text-xs font-medium text-strong">Step 2 — choose your Excel file</h3>
            <p className="mt-1 text-2xs leading-relaxed text-mute">
              .xlsx or .xls. Missing feuilles are skipped; unknown sheets are ignored. Import order is
              Capabilities → Epics → Features → User Stories.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={onFile}
              aria-label="Choose a delivery pack Excel file"
              className="mt-3 block w-full text-2xs text-mute file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-line-strong file:bg-transparent file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-soft hover:file:border-brand hover:file:text-strong"
            />
          </section>

          {error && (
            <p className="flex items-start gap-2 text-xs text-danger">
              <AlertTriangleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}

          {workbook && (
            <section className="rounded-md border border-brand/40 bg-brand/5 p-3">
              <p className="text-xs text-strong">
                {fileName} — {totalRows} rows across {foundSheets.length} feuille
                {foundSheets.length === 1 ? '' : 's'}
              </p>
              <ul className="mt-2 space-y-1 text-2xs text-mute">
                {PACK_SHEETS.map((name) => {
                  const count = workbook[name]?.rows.length ?? 0;
                  return (
                    <li key={name} className="flex gap-2">
                      <span className="w-28 shrink-0 font-mono text-ink-500">{name}</span>
                      <span className={count > 0 ? 'text-soft' : 'text-ink-500'}>
                        {count > 0 ? `${count} rows` : 'missing — skipped'}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {missingSheets.length > 0 && foundSheets.length > 0 && (
                <p className="mt-2 flex items-start gap-2 text-2xs text-warn">
                  <AlertTriangleIcon className="mt-0.5 h-3 w-3 shrink-0" />
                  Missing feuilles will be skipped: {missingSheets.join(', ')}.
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
    </>
  );
}
