import { useEffect, useMemo, useState } from 'react';
import { FileTextIcon, Trash2Icon } from 'lucide-react';
import { Modal } from './Modal';
import { Button, Field, inputClass } from './Primitives';
import { ProductMultiSelect } from './ProductMultiSelect';
import { useRegistry } from '../contexts/RegistryContext';
import { uploadEquipmentPdf } from '../lib/equipmentDocuments';
import type { Equipment } from '../types/registry';

export function EquipmentModal({
  open,
  onClose,
  onCreated,
  equipment = null,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
  equipment?: Equipment | null;
}) {
  const { addEquipment, updateEquipment, equipmentTypes } = useRegistry();
  const isEdit = !!equipment;
  const [name, setName] = useState('');
  const [vendor, setVendor] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState('');
  const [productIds, setProductIds] = useState<string[]>([]);
  const [documentUrl, setDocumentUrl] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [clearDocument, setClearDocument] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedTypes = useMemo(
    () => [...equipmentTypes].sort((a, b) => a.name.localeCompare(b.name)),
    [equipmentTypes]
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    setPdfFile(null);
    setClearDocument(false);
    setSaving(false);
    if (equipment) {
      setName(equipment.name);
      setVendor(equipment.vendor);
      setModel(equipment.model);
      setType(equipment.type || '');
      setProductIds(equipment.productIds ?? []);
      setDocumentUrl(equipment.documentUrl ?? '');
    } else {
      setName('');
      setVendor('');
      setModel('');
      setType(equipmentTypes[0]?.name ?? '');
      setProductIds([]);
      setDocumentUrl('');
    }
  }, [open, equipment, equipmentTypes]);

  const hasTypes = sortedTypes.length > 0;
  const valid =
    name.trim().length > 1 &&
    vendor.trim() !== '' &&
    model.trim() !== '' &&
    type.trim() !== '' &&
    hasTypes &&
    productIds.length > 0;

  async function submit() {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      let id = equipment?.id;
      const base = { name, vendor, model, type, productIds };

      if (equipment) {
        updateEquipment(equipment.id, base);
      } else {
        const created = addEquipment({ ...base, documentUrl: '' });
        id = created.id;
        onCreated?.(created.id);
      }

      let nextUrl = clearDocument ? '' : documentUrl;
      if (pdfFile && id) {
        nextUrl = await uploadEquipmentPdf(id, pdfFile);
      }

      if (id && (pdfFile || clearDocument || (equipment && nextUrl !== (equipment.documentUrl ?? '')))) {
        updateEquipment(id, { documentUrl: nextUrl });
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const showingExisting = !clearDocument && !pdfFile && !!documentUrl;

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-lg"
      title={isEdit ? 'Edit equipment' : 'Add equipment'}
      subtitle={
        isEdit
          ? `${equipment?.id} · changes apply across the register immediately`
          : 'Register a device model so hardware capabilities can be assigned to it.'
      }
      footer={
        <>
          <Button variant="quiet" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void submit()} disabled={!valid || saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add equipment'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Display name" required hint="how it appears in the register">
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Teltonika FMB640"
          />
        </Field>
        <ProductMultiSelect productIds={productIds} onChange={setProductIds} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Vendor" required>
            <input
              className={inputClass}
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="Teltonika"
            />
          </Field>
          <Field label="Model" required>
            <input
              className={inputClass}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="FMB640"
            />
          </Field>
        </div>
        <Field label="Type" required>
          {hasTypes ? (
            <select
              className={inputClass}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {sortedTypes.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="rounded-md border border-line-strong bg-ink-900 px-3 py-2 text-xs text-mute">
              Create an equipment type first from the Equipment page.
            </p>
          )}
        </Field>
        <Field
          label="Document"
          hint="Optional — PDF datasheet or manual (max 10 MB). You can save equipment without a file."
        >
          {showingExisting && (
            <div className="mb-2 flex items-center gap-2 rounded-md border border-line-soft px-2.5 py-2 text-xs">
              <FileTextIcon className="h-3.5 w-3.5 shrink-0 text-mute" />
              <a
                href={documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate text-brand hover:underline"
              >
                Current PDF
              </a>
              <button
                type="button"
                aria-label="Remove document"
                onClick={() => {
                  setClearDocument(true);
                  setDocumentUrl('');
                  setPdfFile(null);
                }}
                className="rounded p-1 text-mute hover:text-danger"
              >
                <Trash2Icon className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {pdfFile && (
            <p className="mb-2 text-2xs text-mute">
              Selected: <span className="text-soft">{pdfFile.name}</span>
            </p>
          )}
          <input
            type="file"
            accept="application/pdf,.pdf"
            aria-label="Optional PDF document upload"
            className="block w-full text-2xs text-mute file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-line-strong file:bg-transparent file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-soft hover:file:border-brand hover:file:text-strong"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setPdfFile(file);
              if (file) setClearDocument(false);
            }}
          />
        </Field>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    </Modal>
  );
}
