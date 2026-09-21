import { useEffect, useMemo, useState } from 'react';
import { CheckIcon, ChevronDownIcon, ChevronRightIcon, SearchIcon } from 'lucide-react';
import { Modal } from './Modal';
import { Button, Field, inputClass } from './Primitives';
import { ProductMultiSelect } from './ProductMultiSelect';
import { useAuth } from '../contexts/AuthContext';
import { useRegistry } from '../contexts/RegistryContext';
import type { Wave, WaveState } from '../types/registry';
import { WAVE_STATES } from '../types/registry';
import { sharesProducts } from '../lib/rbac';

interface Props {
  open: boolean;
  onClose: () => void;
  wave?: Wave | null;
}

/** First A–Z letter of product name; fallback X. */
export function productWaveLetter(productName: string): string {
  const letter = productName
    .trim()
    .replace(/[^a-zA-Z]/g, '')
    .charAt(0)
    .toUpperCase();
  return letter || 'X';
}

/** Next code for a product: W-{Letter}-{nn} (e.g. FleetIQ → W-F-01). */
export function nextWaveCodeForProduct(productName: string, waves: Wave[]): string {
  const letter = productWaveLetter(productName);
  const re = new RegExp(`^W-${letter}-(\\d+)$`, 'i');
  const max = waves.reduce((acc, w) => {
    const m = re.exec(w.code.trim());
    if (!m) return acc;
    const n = Number(m[1]);
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `W-${letter}-${String(max + 1).padStart(2, '0')}`;
}

function Row({
  depth,
  label,
  meta,
  checked,
  onToggle,
  expandable,
  expanded,
  onExpand,
}: {
  depth: number;
  label: string;
  meta: string;
  checked: boolean;
  onToggle: () => void;
  expandable?: boolean;
  expanded?: boolean;
  onExpand?: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded py-1.5 pr-2 transition-colors duration-150 ease-out hover:bg-ink-700"
      style={{ paddingLeft: `${depth * 18 + 4}px` }}
    >
      {expandable ? (
        <button
          type="button"
          onClick={onExpand}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          className="rounded p-0.5 text-mute transition-colors duration-150 ease-out hover:text-strong"
        >
          {expanded ? (
            <ChevronDownIcon className="h-3.5 w-3.5" />
          ) : (
            <ChevronRightIcon className="h-3.5 w-3.5" />
          )}
        </button>
      ) : (
        <span className="w-[18px]" />
      )}
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={checked}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span
          className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
            checked ? 'border-brand bg-brand' : 'border-line-strong'
          }`}
          aria-hidden="true"
        >
          {checked && <CheckIcon className="h-2.5 w-2.5 text-white" />}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs text-soft">{label}</span>
        <span className="shrink-0 font-mono text-2xs text-ink-500">{meta}</span>
      </button>
    </div>
  );
}

export function WaveModal({ open, onClose, wave = null }: Props) {
  const {
    capabilities,
    products,
    epicsOf,
    featuresOf,
    storiesOf,
    waves,
    addWave,
    updateWave,
  } = useRegistry();
  const { capabilityVisible, productVisible } = useAuth();
  const isEdit = !!wave;
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [state, setState] = useState<WaveState>('Planned');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [itemIds, setItemIds] = useState<string[]>([]);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string[]>([]);

  const visibleProducts = useMemo(
    () =>
      products.filter((p) => productVisible(p.id)).sort((a, b) => a.name.localeCompare(b.name)),
    [products, productVisible]
  );

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setName(wave?.name ?? '');
    setDescription(wave?.description ?? '');
    setState(wave?.state ?? 'Planned');
    setDeliveryDate(wave?.deliveryDate ?? '');
    setItemIds(wave?.itemIds ?? []);
    setProductIds(wave?.productIds ?? []);
    setQuery('');
    setExpanded(
      wave?.itemIds.filter((id) => id.startsWith('CAP-') || id.startsWith('EPIC-')) ?? []
    );
    if (wave) {
      setCode(wave.code);
    } else {
      setCode('');
    }
  }, [open, wave]);

  function selectProduct(productId: string) {
    setProductIds([productId]);
    const product = products.find((p) => p.id === productId);
    setCode(nextWaveCodeForProduct(product?.name ?? '', waves));
    // Drop scope items that no longer share the product
    setItemIds((prev) =>
      prev.filter((id) => {
        if (id.startsWith('CAP-')) {
          const cap = capabilities.find((c) => c.id === id);
          return cap ? sharesProducts(cap.productIds, [productId]) : false;
        }
        return true;
      })
    );
  }

  const waveDetailsValid = name.trim().length > 1 && code.trim() !== '' && productIds.length > 0;
  const createValid = waveDetailsValid;
  const editValid = waveDetailsValid;

  const visible = useMemo(() => {
    const scoped = capabilities.filter(
      (c) =>
        capabilityVisible(c) &&
        (productIds.length === 0 || sharesProducts(c.productIds, productIds))
    );
    const q = query.trim().toLowerCase();
    if (!q) return scoped;
    return scoped.filter(
      (c) => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
    );
  }, [capabilities, query, capabilityVisible, productIds]);

  function toggleItem(id: string) {
    setItemIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }
  function toggleExpand(id: string) {
    setExpanded((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  function submitCreate() {
    if (!createValid) return;
    addWave({
      code: code.trim(),
      name: name.trim(),
      description: description.trim(),
      state: 'Planned',
      deliveryDate,
      itemIds,
      productIds,
    });
    onClose();
  }

  function submitEdit() {
    if (!editValid || !wave) return;
    updateWave(wave.id, {
      code: code.trim(),
      name: name.trim(),
      description: description.trim(),
      state,
      deliveryDate,
      itemIds,
      productIds,
    });
    onClose();
  }

  const scopeBlock = (
    <div>
      <div className="mb-1.5 flex flex-wrap items-baseline gap-2">
        <span className="text-xs font-medium text-soft">Scope</span>
        <span className="text-2xs text-mute">
          Select capabilities, epics, features or individual user stories — {itemIds.length}{' '}
          selected
        </span>
      </div>
      <div className="relative mb-2">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-500" />
        <input
          className={`${inputClass} py-1.5 pl-8 text-xs`}
          placeholder="Filter capabilities"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Filter capabilities"
        />
      </div>
      <div className="scroll-thin max-h-72 overflow-y-auto rounded-md border border-line-strong bg-ink-900 p-1.5">
        {visible.map((c) => {
          const epics = epicsOf(c.id);
          const capExpanded = expanded.includes(c.id);
          return (
            <div key={c.id}>
              <Row
                depth={0}
                label={c.name}
                meta={c.id}
                checked={itemIds.includes(c.id)}
                onToggle={() => toggleItem(c.id)}
                expandable={epics.length > 0}
                expanded={capExpanded}
                onExpand={() => toggleExpand(c.id)}
              />
              {capExpanded &&
                epics.map((epic) => {
                  const features = featuresOf(epic.id);
                  const epicExpanded = expanded.includes(epic.id);
                  return (
                    <div key={epic.id}>
                      <Row
                        depth={1}
                        label={epic.name}
                        meta={epic.id}
                        checked={itemIds.includes(epic.id)}
                        onToggle={() => toggleItem(epic.id)}
                        expandable={features.length > 0}
                        expanded={epicExpanded}
                        onExpand={() => toggleExpand(epic.id)}
                      />
                      {epicExpanded &&
                        features.map((feature) => {
                          const stories = storiesOf(feature.id);
                          const featureExpanded = expanded.includes(feature.id);
                          return (
                            <div key={feature.id}>
                              <Row
                                depth={2}
                                label={feature.name}
                                meta={feature.id}
                                checked={itemIds.includes(feature.id)}
                                onToggle={() => toggleItem(feature.id)}
                                expandable={stories.length > 0}
                                expanded={featureExpanded}
                                onExpand={() => toggleExpand(feature.id)}
                              />
                              {featureExpanded &&
                                stories.map((story) => (
                                  <Row
                                    key={story.id}
                                    depth={3}
                                    label={story.title}
                                    meta={story.id}
                                    checked={itemIds.includes(story.id)}
                                    onToggle={() => toggleItem(story.id)}
                                  />
                                ))}
                            </div>
                          );
                        })}
                    </div>
                  );
                })}
            </div>
          );
        })}
        {visible.length === 0 && (
          <p className="py-6 text-center text-xs text-mute">
            {productIds.length === 0
              ? 'Select a product to list capabilities.'
              : 'No capability matches that filter.'}
          </p>
        )}
      </div>
    </div>
  );

  if (isEdit) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title={`Edit ${wave.code}`}
        subtitle="Update wave details, state, delivery date, or scope."
        footer={
          <>
            <Button variant="quiet" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submitEdit} disabled={!editValid}>
              Save wave
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-[120px_minmax(0,1fr)]">
            <Field label="Code" hint="generated automatically">
              <input className={`${inputClass} text-mute`} value={code} readOnly disabled />
            </Field>
            <Field label="Wave name" required>
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Maintenance increment"
              />
            </Field>
          </div>
          <Field label="Description">
            <textarea
              className={`${inputClass} min-h-[72px] resize-y`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this increment proves on production."
            />
          </Field>
          <ProductMultiSelect productIds={productIds} onChange={setProductIds} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="State">
              <select
                className={inputClass}
                value={state}
                onChange={(e) => setState(e.target.value as WaveState)}
              >
                {WAVE_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date de livraison" hint="optionnel">
              <input
                type="date"
                className={inputClass}
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </Field>
          </div>
          {scopeBlock}
        </div>
      </Modal>
    );
  }

  const stepLabel =
    step === 1 ? 'Step 1 of 3 — Product' : step === 2 ? 'Step 2 of 3 — Wave' : 'Step 3 of 3 — Delivery';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Define a wave"
      subtitle={stepLabel}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          {step > 1 && (
            <Button variant="quiet" onClick={() => setStep((s) => (s === 3 ? 2 : 1))}>
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button
              variant="primary"
              onClick={() => setStep((s) => (s === 1 ? 2 : 3))}
              disabled={step === 1 ? productIds.length === 0 : !waveDetailsValid}
            >
              Next
            </Button>
          ) : (
            <Button variant="primary" onClick={submitCreate} disabled={!createValid}>
              Create wave
            </Button>
          )}
        </>
      }
    >
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-xs leading-relaxed text-mute">
            Choose the product this wave belongs to. The wave code is generated from the product
            name (e.g. FleetIQ → W-F-01).
          </p>
          {visibleProducts.length === 0 ? (
            <p className="text-sm text-mute">No products available.</p>
          ) : (
            <ul className="space-y-1.5">
              {visibleProducts.map((p) => {
                const selected = productIds[0] === p.id;
                const preview = nextWaveCodeForProduct(p.name, waves);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => selectProduct(p.id)}
                      aria-pressed={selected}
                      className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors duration-150 ease-out ${
                        selected
                          ? 'border-brand/50 bg-brand/5'
                          : 'border-line-strong hover:border-brand'
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                          selected ? 'border-brand bg-brand' : 'border-line-strong'
                        }`}
                        aria-hidden="true"
                      >
                        {selected && <CheckIcon className="h-2.5 w-2.5 text-white" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-strong">{p.name}</span>
                        <span className="font-mono text-2xs text-mute">{p.id}</span>
                      </span>
                      <span className="font-mono text-2xs text-violet">{preview}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {code && (
            <p className="text-2xs text-mute">
              Assigned code: <span className="font-mono text-soft">{code}</span>
            </p>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-[120px_minmax(0,1fr)]">
            <Field label="Code" hint="from product">
              <input className={`${inputClass} text-mute`} value={code} readOnly disabled />
            </Field>
            <Field label="Wave name" required>
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Maintenance increment"
                autoFocus
              />
            </Field>
          </div>
          <Field label="Description">
            <textarea
              className={`${inputClass} min-h-[72px] resize-y`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this increment proves on production."
            />
          </Field>
          {scopeBlock}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-xs leading-relaxed text-mute">
            Set the planned delivery date (livrable). State starts as Planned — you can change it
            or mark the wave done from the Waves list after creation.
          </p>
          <Field label="Date de livraison" hint="optionnel">
            <input
              type="date"
              className={inputClass}
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              autoFocus
            />
          </Field>
          <dl className="rounded-md border border-line-soft px-3 py-2 text-xs text-mute">
            <div className="flex gap-2 py-1">
              <dt className="w-20 shrink-0 text-ink-500">Code</dt>
              <dd className="font-mono text-soft">{code}</dd>
            </div>
            <div className="flex gap-2 py-1">
              <dt className="w-20 shrink-0 text-ink-500">Name</dt>
              <dd className="text-soft">{name || '—'}</dd>
            </div>
            <div className="flex gap-2 py-1">
              <dt className="w-20 shrink-0 text-ink-500">Product</dt>
              <dd className="text-soft">
                {products.find((p) => p.id === productIds[0])?.name ?? '—'}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </Modal>
  );
}
