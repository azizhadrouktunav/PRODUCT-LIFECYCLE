import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangleIcon, LayoutDashboardIcon } from 'lucide-react';
import { PageHeader, ProgressBar, StatusTag } from '../components/Primitives';
import { useAuth } from '../contexts/AuthContext';
import { useRegistry } from '../contexts/RegistryContext';
import type { CapabilityStatus, Product } from '../types/registry';
import {
  CAPABILITY_STATUSES,
  isStageAhead,
  isStoryDone,
  stageIndex,
  usesEquipment,
} from '../types/registry';
import { sharesProducts } from '../lib/rbac';
import { waveStories } from '../utils/scope';

function pct(n: number, d: number): number {
  if (d <= 0) return 0;
  return Math.round((n / d) * 100);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DashboardPage() {
  const {
    products,
    capabilities,
    stories,
    waves,
    epics,
    features,
    lifecycleOf,
    countsOf,
  } = useRegistry();
  const { capabilityVisible, productVisible, entityVisible, roleLabel } = useAuth();
  const [productFilter, setProductFilter] = useState<string | null>(null);

  const visibleProducts = useMemo(
    () => products.filter((p) => productVisible(p.id)).sort((a, b) => a.name.localeCompare(b.name)),
    [products, productVisible]
  );

  const scopedCaps = useMemo(() => {
    let list = capabilities.filter(capabilityVisible);
    if (productFilter) {
      list = list.filter((c) => (c.productIds ?? []).includes(productFilter));
    }
    return list;
  }, [capabilities, capabilityVisible, productFilter]);

  const scopedStories = useMemo(() => {
    const capIds = new Set(scopedCaps.map((c) => c.id));
    const epicIds = new Set(epics.filter((e) => capIds.has(e.capabilityId)).map((e) => e.id));
    const featureIds = new Set(features.filter((f) => epicIds.has(f.epicId)).map((f) => f.id));
    return stories.filter((s) => featureIds.has(s.featureId));
  }, [scopedCaps, epics, features, stories]);

  const scopedWaves = useMemo(() => {
    let list = waves.filter((w) => entityVisible(w.productIds));
    if (productFilter) {
      list = list.filter((w) => (w.productIds ?? []).includes(productFilter));
    }
    return list;
  }, [waves, entityVisible, productFilter]);

  const statusCounts = useMemo(() => {
    const map = Object.fromEntries(CAPABILITY_STATUSES.map((s) => [s, 0])) as Record<
      CapabilityStatus,
      number
    >;
    let unset = 0;
    for (const c of scopedCaps) {
      if (c.status) map[c.status] += 1;
      else unset += 1;
    }
    return { map, unset };
  }, [scopedCaps]);

  const definition = useMemo(() => {
    let hardwareSum = 0;
    let hardwareN = 0;
    let deliverySum = 0;
    let deliveryN = 0;
    let ahead = 0;
    for (const c of scopedCaps) {
      const lc = lifecycleOf(c);
      const last = Math.max(lc.stages.length - 1, 1);
      const idx = Math.max(stageIndex(lc, c.progress), 0);
      const ratio = idx / last;
      if (usesEquipment(lc)) {
        hardwareSum += ratio;
        hardwareN += 1;
      } else {
        deliverySum += ratio;
        deliveryN += 1;
      }
      if (isStageAhead(lc, c.progress, countsOf(c.id))) ahead += 1;
    }
    return {
      hardwarePct: hardwareN > 0 ? Math.round((hardwareSum / hardwareN) * 100) : 0,
      deliveryPct: deliveryN > 0 ? Math.round((deliverySum / deliveryN) * 100) : 0,
      ahead,
      hardwareN,
      deliveryN,
    };
  }, [scopedCaps, lifecycleOf, countsOf]);

  const execution = useMemo(() => {
    const done = scopedStories.filter((s) => {
      const feature = features.find((f) => f.id === s.featureId);
      const epic = feature ? epics.find((e) => e.id === feature.epicId) : undefined;
      const cap = epic ? scopedCaps.find((c) => c.id === epic.capabilityId) : undefined;
      return isStoryDone(s, cap ? lifecycleOf(cap) : undefined);
    }).length;
    const pointsTotal = scopedStories.reduce((acc, s) => acc + (s.points ?? 0), 0);
    const pointsDone = scopedStories.reduce((acc, s) => {
      const feature = features.find((f) => f.id === s.featureId);
      const epic = feature ? epics.find((e) => e.id === feature.epicId) : undefined;
      const cap = epic ? scopedCaps.find((c) => c.id === epic.capabilityId) : undefined;
      return acc + (isStoryDone(s, cap ? lifecycleOf(cap) : undefined) ? s.points ?? 0 : 0);
    }, 0);
    return {
      done,
      total: scopedStories.length,
      pct: pct(done, scopedStories.length),
      pointsPct: pct(pointsDone, pointsTotal),
      pointsDone,
      pointsTotal,
    };
  }, [scopedStories, features, epics, scopedCaps, lifecycleOf]);

  const funnel = useMemo(() => {
    const stages = new Map<string, number>();
    for (const s of scopedStories) {
      stages.set(s.stage, (stages.get(s.stage) ?? 0) + 1);
    }
    return [...stages.entries()].sort((a, b) => b[1] - a[1]);
  }, [scopedStories]);

  const risk = useMemo(() => {
    const flagged = scopedCaps.filter(
      (c) => c.status === 'On Hold' || c.status === 'Needs Review'
    );
    const today = todayIso();
    const overdue = scopedWaves.filter((w) => {
      if (!w.deliveryDate || w.deliveryDate >= today || w.state === 'Closed') return false;
      const scope = waveStories(w, { epics, features, stories });
      const done = scope.filter((s) => isStoryDone(s)).length;
      return scope.length === 0 || done < scope.length;
    });
    return { flagged, overdue };
  }, [scopedCaps, scopedWaves, epics, features, stories]);

  const waveRows = useMemo(() => {
    return [...scopedWaves]
      .sort((a, b) => (a.deliveryDate || '9999').localeCompare(b.deliveryDate || '9999'))
      .slice(0, 8)
      .map((w) => {
        const scope = waveStories(w, { epics, features, stories });
        const done = scope.filter((s) => isStoryDone(s)).length;
        return { wave: w, done, total: scope.length, pct: pct(done, scope.length) };
      });
  }, [scopedWaves, epics, features, stories]);

  const productRows = useMemo(() => {
    const list: Product[] = productFilter
      ? visibleProducts.filter((p) => p.id === productFilter)
      : visibleProducts;
    return list.map((p) => {
      const caps = capabilities.filter(
        (c) => capabilityVisible(c) && sharesProducts(c.productIds, [p.id])
      );
      const capIds = new Set(caps.map((c) => c.id));
      const epicIds = new Set(epics.filter((e) => capIds.has(e.capabilityId)).map((e) => e.id));
      const featureIds = new Set(features.filter((f) => epicIds.has(f.epicId)).map((f) => f.id));
      const productStories = stories.filter((s) => featureIds.has(s.featureId));
      const done = productStories.filter((s) => isStoryDone(s)).length;
      const onHold = caps.filter((c) => c.status === 'On Hold').length;
      const nextWave = waves
        .filter((w) => entityVisible(w.productIds) && sharesProducts(w.productIds, [p.id]))
        .filter((w) => w.deliveryDate)
        .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))[0];
      return {
        product: p,
        caps: caps.length,
        storyPct: pct(done, productStories.length),
        onHold,
        nextWave: nextWave?.deliveryDate ?? '—',
      };
    });
  }, [
    visibleProducts,
    productFilter,
    capabilities,
    capabilityVisible,
    epics,
    features,
    stories,
    waves,
    entityVisible,
  ]);

  const healthTotal = scopedCaps.length;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        count={roleLabel}
        action={
          <Link
            to="/capabilities"
            className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-2.5 py-1.5 text-xs text-soft transition-colors hover:border-brand hover:text-strong"
          >
            <LayoutDashboardIcon className="h-3.5 w-3.5" />
            Open capabilities
          </Link>
        }
      />

      <div className="mt-4 flex flex-wrap gap-1.5">
        <FilterChip
          active={productFilter === null}
          label="All products"
          onClick={() => setProductFilter(null)}
        />
        {visibleProducts.map((p) => (
          <FilterChip
            key={p.id}
            active={productFilter === p.id}
            label={p.name}
            onClick={() => setProductFilter(p.id)}
          />
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Capabilities"
          value={String(healthTotal)}
          hint={`${statusCounts.map['In Progress'] ?? 0} in progress`}
          to="/capabilities"
        />
        <KpiCard
          label="Definition maturity"
          value={`${definition.deliveryN + definition.hardwareN > 0 ? Math.round(((definition.deliveryPct * definition.deliveryN + definition.hardwarePct * definition.hardwareN) / (definition.deliveryN + definition.hardwareN))) : 0}%`}
          hint={`Delivery ${definition.deliveryPct}% · Hardware ${definition.hardwarePct}%`}
          to="/capabilities"
        />
        <KpiCard
          label="Story execution"
          value={`${execution.pct}%`}
          hint={`${execution.done}/${execution.total} released${execution.pointsTotal > 0 ? ` · ${execution.pointsPct}% pts` : ''}`}
          to="/waves"
        />
        <KpiCard
          label="At risk"
          value={String(risk.flagged.length + risk.overdue.length)}
          hint={`${risk.flagged.length} on hold/review · ${risk.overdue.length} overdue waves`}
          to="/capabilities?status=On%20Hold"
          danger={risk.flagged.length + risk.overdue.length > 0}
        />
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-strong">Portfolio health</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to="/capabilities?status=none"
            className="inline-flex items-center gap-2 rounded border border-line-strong px-2.5 py-1.5 transition-colors hover:border-brand"
          >
            <StatusTag status={null} />
            <span className="font-mono text-xs text-soft">{statusCounts.unset}</span>
          </Link>
          {CAPABILITY_STATUSES.map((s) => (
            <Link
              key={s}
              to={`/capabilities?status=${encodeURIComponent(s)}`}
              className="inline-flex items-center gap-2 rounded border border-line-strong px-2.5 py-1.5 transition-colors hover:border-brand"
            >
              <StatusTag status={s} />
              <span className="font-mono text-xs text-soft">{statusCounts.map[s]}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-sm font-semibold text-strong">Story funnel</h2>
          {funnel.length === 0 ? (
            <p className="mt-3 text-xs text-mute">No stories in scope.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {funnel.map(([stage, count]) => (
                <li key={stage}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-soft">{stage}</span>
                    <span className="font-mono text-mute">{count}</span>
                  </div>
                  <ProgressBar done={count} total={execution.total || 1} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-strong">Wave delivery</h2>
          {waveRows.length === 0 ? (
            <p className="mt-3 text-xs text-mute">No waves in scope.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {waveRows.map(({ wave: w, done, total }) => (
                <li key={w.id} className="border-t border-line pt-3 first:border-0 first:pt-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <Link to="/waves" className="text-xs font-medium text-strong hover:text-brand-bright">
                      {w.code} · {w.name}
                    </Link>
                    <span className="font-mono text-2xs text-mute">
                      {w.deliveryDate ? `Livraison ${w.deliveryDate}` : 'No date'} · {w.state}
                    </span>
                    <span className="ml-auto font-mono text-2xs text-mute">
                      {done}/{total}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <ProgressBar done={done} total={total || 1} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {(risk.flagged.length > 0 || risk.overdue.length > 0 || definition.ahead > 0) && (
        <section className="mt-8 rounded-md border border-amber/30 bg-amber/5 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-strong">
            <AlertTriangleIcon className="h-4 w-4 text-amber" />
            Attention
          </h2>
          <ul className="mt-2 space-y-1 text-xs text-soft">
            {definition.ahead > 0 && (
              <li>
                {definition.ahead} capability{definition.ahead === 1 ? '' : 'ies'} claim a stage ahead
                of supporting evidence
              </li>
            )}
            {risk.flagged.slice(0, 5).map((c) => (
              <li key={c.id}>
                <Link to={`/capabilities/${c.id}`} className="text-brand-bright hover:text-strong">
                  {c.id}
                </Link>{' '}
                — {c.status}: {c.name}
              </li>
            ))}
            {risk.overdue.map((w) => (
              <li key={w.id}>
                Wave {w.code} past {w.deliveryDate} with incomplete stories
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-strong">By product</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead>
              <tr className="border-b border-line text-2xs uppercase tracking-[0.12em] text-ink-500">
                <th className="py-2 pr-3 font-medium">Product</th>
                <th className="py-2 pr-3 font-medium">Caps</th>
                <th className="py-2 pr-3 font-medium">Stories done</th>
                <th className="py-2 pr-3 font-medium">On hold</th>
                <th className="py-2 font-medium">Next wave</th>
              </tr>
            </thead>
            <tbody>
              {productRows.map((row) => (
                <tr key={row.product.id} className="border-b border-line-soft">
                  <td className="py-2.5 pr-3">
                    <Link to="/products" className="font-medium text-strong hover:text-brand-bright">
                      {row.product.name}
                    </Link>
                    <span className="ml-2 font-mono text-2xs text-ink-500">{row.product.id}</span>
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-soft">{row.caps}</td>
                  <td className="py-2.5 pr-3">
                    <div className="flex max-w-[140px] items-center gap-2">
                      <ProgressBar done={row.storyPct} total={100} />
                      <span className="font-mono text-mute">{row.storyPct}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-soft">{row.onHold}</td>
                  <td className="py-2.5 font-mono text-mute">{row.nextWave}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded border px-2.5 py-1 text-2xs transition-colors ${
        active
          ? 'border-brand bg-brand/10 text-strong'
          : 'border-line-strong text-mute hover:text-strong'
      }`}
    >
      {label}
    </button>
  );
}

function KpiCard({
  label,
  value,
  hint,
  to,
  danger,
}: {
  label: string;
  value: string;
  hint: string;
  to: string;
  danger?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`rounded-md border p-4 transition-colors hover:border-brand ${
        danger ? 'border-amber/40 bg-amber/5' : 'border-line-strong'
      }`}
    >
      <span className="block text-2xs uppercase tracking-[0.14em] text-ink-500">{label}</span>
      <span className="mt-2 block text-2xl font-semibold text-strong">{value}</span>
      <span className="mt-1 block text-2xs text-mute">{hint}</span>
    </Link>
  );
}
