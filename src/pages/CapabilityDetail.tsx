import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';
import { Chip, StatusTag, TONE_DOT, TONE_TEXT } from '../components/Primitives';
import { useAuth } from '../contexts/AuthContext';
import { useRegistry } from '../contexts/RegistryContext';
import {
  childWorkItemTypes,
  isStoryDone,
  rootWorkItemTypes,
  stageDef,
  stageIndex,
  storyStagesOf,
  usesEquipment,
  workItemTypeDef,
} from '../types/registry';

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="border-l border-line pl-3">
      <p className="text-2xs uppercase tracking-[0.14em] text-ink-500">{label}</p>
      <p className="mt-0.5 font-mono text-lg leading-none text-strong">{value}</p>
      {hint && <p className="mt-1 text-2xs text-mute">{hint}</p>}
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[100px_minmax(0,1fr)] items-start gap-3 border-b border-line-soft py-2 last:border-0">
      <dt className="text-2xs uppercase tracking-[0.14em] text-ink-500">{label}</dt>
      <dd className="min-w-0 text-xs text-soft">{children}</dd>
    </div>
  );
}

function managePath(
  capabilityId: string,
  typeId: string,
  storage: 'builtin' | 'custom'
): string {
  if (storage === 'builtin' && typeId === 'epic') {
    return `/capabilities/${capabilityId}/epics`;
  }
  return `/capabilities/${capabilityId}/items/${typeId}`;
}

export function CapabilityDetailPage() {
  const { capabilityId = '' } = useParams();
  const navigate = useNavigate();
  const {
    getCapability,
    getGroup,
    getProduct,
    equipment,
    countsOf,
    lifecycleOf,
    waves,
    epicsOf,
    featuresOf,
    storiesOf,
    storiesOfEpic,
    workItemsOf,
  } = useRegistry();

  const { capabilityVisible, productVisible } = useAuth();

  const capability = getCapability(capabilityId);

  if (!capability || !capabilityVisible(capability)) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-soft">That capability is not in the register.</p>
        <Link
          to="/capabilities"
          className="mt-2 inline-block text-xs text-brand-bright hover:text-strong"
        >
          Back to the register
        </Link>
      </div>
    );
  }

  const counts = countsOf(capability.id);
  const group = getGroup(capability.groupId);
  const lifecycle = lifecycleOf(capability);
  const isHardware = usesEquipment(lifecycle);
  const stages = lifecycle.stages;
  const idx = stageIndex(lifecycle, capability.progress);
  const current = stageDef(lifecycle, capability.progress);
  const linked = equipment.filter((e) => capability.equipmentIds.includes(e.id));
  const inWaves = waves.filter((w) => w.itemIds.includes(capability.id));
  const rootTypes = rootWorkItemTypes(lifecycle);
  const storyStages = storyStagesOf(lifecycle);
  const epics = epicsOf(capability.id);
  const capStories = epics.flatMap((e) => featuresOf(e.id)).flatMap((f) => storiesOf(f.id));
  const released = capStories.filter((s) => isStoryDone(s, lifecycle)).length;

  const tableStages = stages.filter(
    (s) => (s.contentMode ?? 'inline') === 'table' && s.opensTypeId
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/capabilities')}
        className="inline-flex items-center gap-1.5 text-xs text-mute transition-colors duration-150 ease-out hover:text-strong"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        Capability Register
      </button>

      <header className="mt-3 border-b border-line pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-xs text-mute">{capability.id}</span>
          <span className="text-xs text-soft">{group?.name}</span>
          <StatusTag status={capability.status} />
        </div>
        <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-strong">
          {capability.name}
        </h1>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-mute">
          {capability.description}
        </p>
      </header>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section>
          <div className="flex flex-wrap items-center gap-6">
            {isHardware ? (
              <Metric label="Equipment" value={counts.equipment} hint="models supporting it" />
            ) : rootTypes.length > 0 ? (
              rootTypes.map((t) => (
                <Metric
                  key={t.id}
                  label={t.pluralLabel}
                  value={
                    t.id === 'epic'
                      ? counts.epics
                      : t.id === 'feature'
                        ? counts.features
                        : t.id === 'story'
                          ? counts.stories
                          : (counts.byType?.[t.id] ?? workItemsOf(capability.id, t.id).length)
                  }
                />
              ))
            ) : (
              <>
                <Metric label="Epics" value={counts.epics} />
                <Metric label="Features" value={counts.features} />
                <Metric label="Stories" value={counts.stories} />
              </>
            )}
            {!isHardware && storyStages.length > 0 && (
              <Metric
                label="Released"
                value={`${released}/${counts.stories}`}
                hint="user stories"
              />
            )}
          </div>

          <div className="mt-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xs uppercase tracking-[0.14em] text-ink-500">
                Definition progress
              </h2>
              <span className="font-mono text-2xs text-ink-500">
                {idx + 1} / {stages.length}
              </span>
            </div>
            <div className="mt-1.5 flex gap-0.5">
              {stages.map((s, i) => (
                <span
                  key={s.name}
                  title={`${i + 1}. ${s.name} — ${s.description}`}
                  className={`h-1.5 flex-1 rounded-full ${
                    i <= idx ? TONE_DOT[s.tone] : 'bg-ink-600'
                  }`}
                />
              ))}
            </div>
            {current && (
              <p className="mt-1.5 text-xs leading-relaxed text-mute">
                <span className={`font-medium ${TONE_TEXT[current.tone]}`}>{current.name}</span>{' '}
                — {current.description}
                {(current.contentMode ?? 'inline') === 'table' && current.opensTypeId && (
                  <>
                    {' '}
                    <Link
                      to={managePath(
                        capability.id,
                        current.opensTypeId,
                        workItemTypeDef(lifecycle, current.opensTypeId)?.storage ?? 'custom'
                      )}
                      className="text-brand-bright hover:text-strong"
                    >
                      Open{' '}
                      {workItemTypeDef(lifecycle, current.opensTypeId)?.pluralLabel ??
                        current.opensTypeId}
                    </Link>
                  </>
                )}
              </p>
            )}
          </div>

          {isHardware ? (
            <div className="mt-6">
              <h2 className="text-2xs uppercase tracking-[0.14em] text-ink-500">
                Assigned equipment
              </h2>
              {linked.length ? (
                <ul className="mt-1">
                  {linked.map((e) => (
                    <li
                      key={e.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line-soft py-2"
                    >
                      <span className="font-mono text-2xs text-ink-500">{e.id}</span>
                      <span className="text-xs text-strong">{e.name}</span>
                      <span className="text-2xs text-mute">{e.type}</span>
                      <span className="ml-auto text-2xs text-mute">
                        {e.vendor} · {e.model}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-mute">No equipment linked yet.</p>
              )}
              <Link
                to="/equipment"
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-brand-bright transition-colors duration-150 ease-out hover:text-strong"
              >
                Equipment page
                <ArrowRightIcon className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <>
              {storyStages.length > 0 && (
                <div className="mt-6">
                  <h2 className="text-2xs uppercase tracking-[0.14em] text-ink-500">
                    User story pipeline
                  </h2>
                  <ul className="mt-1.5 grid gap-1.5 sm:grid-cols-3 xl:grid-cols-6">
                    {storyStages.map((s) => {
                      const n = capStories.filter((st) => st.stage === s.name).length;
                      return (
                        <li
                          key={s.name}
                          title={s.description}
                          className={`rounded-md border px-2.5 py-2 ${
                            n > 0 ? 'border-line-strong' : 'border-line'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[s.tone]}`}
                              aria-hidden="true"
                            />
                            <span
                              className={`font-mono text-sm ${n > 0 ? 'text-strong' : 'text-mute'}`}
                            >
                              {n}
                            </span>
                          </div>
                          <p className="mt-0.5 text-2xs leading-tight text-mute">{s.name}</p>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Root hierarchy sections (builtin epics or custom roots) */}
              {rootTypes.map((t) => {
                if (t.storage === 'builtin' && t.id === 'epic') {
                  return (
                    <div key={t.id} className="mt-6">
                      <div className="flex items-baseline justify-between">
                        <h2 className="text-2xs uppercase tracking-[0.14em] text-ink-500">
                          {t.pluralLabel}
                        </h2>
                        <Link
                          to={`/capabilities/${capability.id}/epics`}
                          className="inline-flex items-center gap-1.5 text-xs text-brand-bright transition-colors duration-150 ease-out hover:text-strong"
                        >
                          Manage {t.pluralLabel.toLowerCase()}
                          <ArrowRightIcon className="h-3 w-3" />
                        </Link>
                      </div>
                      {epics.length ? (
                        <ul className="mt-1">
                          {epics.map((epic) => {
                            const epicStories = storiesOfEpic(epic.id);
                            return (
                              <li key={epic.id} className="border-b border-line-soft py-2">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                  <span className="font-mono text-2xs text-ink-500">
                                    {epic.id}
                                  </span>
                                  <Link
                                    to={`/capabilities/${capability.id}/epics/${epic.id}/features`}
                                    className="text-xs text-strong transition-colors duration-150 ease-out hover:text-brand-bright"
                                  >
                                    {epic.name}
                                  </Link>
                                  <StatusTag status={epic.status} />
                                  <span className="ml-auto font-mono text-2xs text-mute">
                                    {featuresOf(epic.id).length}F · {epicStories.length}S ·{' '}
                                    {
                                      epicStories.filter((s) => isStoryDone(s, lifecycle))
                                        .length
                                    }{' '}
                                    released
                                  </span>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-mute">
                          Not decomposed into {t.pluralLabel.toLowerCase()} yet.
                        </p>
                      )}
                    </div>
                  );
                }

                if (t.storage === 'custom') {
                  const rows = workItemsOf(capability.id, t.id, null);
                  const nested = childWorkItemTypes(lifecycle, t.id);
                  return (
                    <div key={t.id} className="mt-6">
                      <div className="flex items-baseline justify-between">
                        <h2 className="text-2xs uppercase tracking-[0.14em] text-ink-500">
                          {t.pluralLabel}
                        </h2>
                        <Link
                          to={`/capabilities/${capability.id}/items/${t.id}`}
                          className="inline-flex items-center gap-1.5 text-xs text-brand-bright hover:text-strong"
                        >
                          Manage {t.pluralLabel.toLowerCase()}
                          <ArrowRightIcon className="h-3 w-3" />
                        </Link>
                      </div>
                      {rows.length ? (
                        <ul className="mt-1">
                          {rows.map((row) => (
                            <li
                              key={row.id}
                              className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line-soft py-2"
                            >
                              <span className="font-mono text-2xs text-ink-500">{row.id}</span>
                              <span className="text-xs text-strong">{row.name}</span>
                              <StatusTag status={row.status} />
                              {nested.map((ct) => (
                                <Link
                                  key={ct.id}
                                  to={`/capabilities/${capability.id}/items/${ct.id}?parent=${row.id}`}
                                  className="ml-auto text-2xs text-brand-bright"
                                >
                                  {ct.pluralLabel}
                                </Link>
                              ))}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-mute">
                          No {t.pluralLabel.toLowerCase()} yet.
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              })}

              {/* Stages that open tables not already covered by root types */}
              {tableStages
                .filter((s) => {
                  const tid = s.opensTypeId!;
                  return !rootTypes.some((r) => r.id === tid);
                })
                .map((s) => {
                  const t = workItemTypeDef(lifecycle, s.opensTypeId!);
                  if (!t) return null;
                  return (
                    <div key={s.name} className="mt-6">
                      <div className="flex items-baseline justify-between">
                        <h2 className="text-2xs uppercase tracking-[0.14em] text-ink-500">
                          {s.name} → {t.pluralLabel}
                        </h2>
                        <Link
                          to={managePath(capability.id, t.id, t.storage)}
                          className="inline-flex items-center gap-1.5 text-xs text-brand-bright hover:text-strong"
                        >
                          Open table
                          <ArrowRightIcon className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
            </>
          )}
        </section>

        <aside>
          <h2 className="text-2xs uppercase tracking-[0.14em] text-ink-500">Record</h2>
          <dl className="mt-1">
            <MetaRow label="Group">
              <Link
                to="/groups"
                className="transition-colors duration-150 ease-out hover:text-strong"
              >
                {group?.name ?? '—'}
              </Link>
            </MetaRow>
            <MetaRow label="Epic key">
              {capability.jiraEpic ? (
                <span className="font-mono text-2xs text-brand-bright">
                  {capability.jiraEpic}
                </span>
              ) : (
                '—'
              )}
            </MetaRow>
            <MetaRow label="Products">
              <div className="flex flex-wrap gap-1">
                {(capability.productIds ?? []).filter(productVisible).map((id) => (
                  <Chip key={id} tone="brand" title={getProduct(id)?.name}>
                    {id}
                  </Chip>
                ))}
              </div>
            </MetaRow>
            <MetaRow label="Lifecycle">
              <Link
                to="/lifecycles"
                className="transition-colors duration-150 ease-out hover:text-strong"
              >
                {lifecycle.label}
              </Link>
            </MetaRow>
            <MetaRow label="Waves">
              {inWaves.length ? (
                <div className="flex flex-wrap gap-1">
                  {inWaves.map((w) => (
                    <Chip key={w.id} tone="neutral">
                      {w.code || w.name}
                    </Chip>
                  ))}
                </div>
              ) : (
                '—'
              )}
            </MetaRow>
          </dl>
        </aside>
      </div>
    </div>
  );
}
