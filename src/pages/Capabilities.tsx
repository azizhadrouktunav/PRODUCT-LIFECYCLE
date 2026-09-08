import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangleIcon, PlusIcon, SearchIcon, XIcon } from 'lucide-react';
import { DataTransfer } from '../components/DataTransfer';
import { RowActions } from '../components/RowActions';
import { Button, Chip, PageHeader, StagePill, StatusTag, inputClass } from '../components/Primitives';
import { useCapabilityEditor } from '../contexts/CapabilityEditorContext';
import { useRegistry } from '../contexts/RegistryContext';
import { CAPABILITY_STATUSES, TRACKS, isStageAhead } from '../types/registry';

const selectClass =
'rounded-md border border-line-strong bg-ink-800 px-2.5 py-1.5 text-xs text-soft transition-colors duration-150 ease-out focus:border-brand focus:outline-none';

export function CapabilitiesPage() {
  const {
    capabilities,
    groups,
    categories,
    equipment,
    getGroup,
    getDomain,
    countsOf,
    trackOf
  } = useRegistry();
  const getEquipment = (id: string) => equipment.find((e) => e.id === id);
  const { openCreate, openEdit } = useCapabilityEditor();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [domainFilter, setDomainFilter] = useState('all');
  const [progressFilter, setProgressFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return capabilities.filter((c) => {
      if (groupFilter !== 'all' && c.groupId !== groupFilter) return false;
      if (progressFilter !== 'all' && c.progress !== progressFilter) return false;
      if (statusFilter !== 'all' && (c.status ?? 'none') !== statusFilter) return false;
      if (
      domainFilter !== 'all' &&
      !c.domainIds.some((id) => getDomain(id)?.categoryId === domainFilter))

      return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.jiraEpic.toLowerCase().includes(q) ||
        c.domainIds.some((d) => d.toLowerCase().includes(q)));

    });
  }, [capabilities, query, groupFilter, domainFilter, progressFilter, statusFilter, getDomain]);

  const filtered =
  groupFilter !== 'all' ||
  domainFilter !== 'all' ||
  progressFilter !== 'all' ||
  statusFilter !== 'all' ||
  query.trim() !== '';

  function clearFilters() {
    setQuery('');
    setGroupFilter('all');
    setDomainFilter('all');
    setProgressFilter('all');
    setStatusFilter('all');
  }

  // The status progression depends on the group, so picking a group re-scopes it.
  const selectedGroup = groups.find((g) => g.id === groupFilter);
  const stageOptions = selectedGroup ? TRACKS[selectedGroup.track].stages.map((s) => s.name) : [];

  function changeGroup(value: string) {
    setGroupFilter(value);
    setProgressFilter('all');
  }

  return (
    <div>
      <PageHeader
        title="Capability Register"
        count={`${capabilities.length} entries`}
        description="Every capability across TUNAV ONE Core, FleetIQ and CoreIQ."
        action={
        <div className="flex flex-wrap items-center gap-1.5">
            <DataTransfer dataset="capabilities" />
            <Button variant="primary" onClick={openCreate}>
              <PlusIcon className="h-3.5 w-3.5" />
              Add capability
            </Button>
          </div>
        } />
      

      <div className="flex flex-wrap items-center gap-2 py-3">
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-500" />
          <input
            className={`${inputClass} py-1.5 pl-8 text-xs`}
            placeholder="Search name, ID, epic or domain"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search capabilities" />
          
        </div>
        <select
          className={selectClass}
          value={groupFilter}
          onChange={(e) => changeGroup(e.target.value)}
          aria-label="Filter by capability group">
          
          <option value="all">All groups</option>
          {groups.map((g) =>
          <option key={g.id} value={g.id}>
              {g.name}
            </option>
          )}
        </select>
        <select
          className={selectClass}
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          aria-label="Filter by domain category">
          
          <option value="all">All domains</option>
          {categories.map((cat) =>
          <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          )}
        </select>
        <select
          className={`${selectClass} disabled:cursor-not-allowed disabled:text-ink-500`}
          value={progressFilter}
          disabled={!selectedGroup}
          onChange={(e) => setProgressFilter(e.target.value)}
          aria-label="Filter by status progress"
          title={selectedGroup ? undefined : 'Select a capability group first'}>
          
          <option value="all">
            {selectedGroup ? `All ${TRACKS[selectedGroup.track].label} stages` : 'Select a group first'}
          </option>
          {stageOptions.map((s, i) =>
          <option key={s} value={s}>
              {i + 1}. {s}
            </option>
          )}
        </select>
        <select
          className={selectClass}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status">
          
          <option value="all">Any status</option>
          <option value="none">No flag</option>
          {CAPABILITY_STATUSES.map((s) =>
          <option key={s} value={s}>
              {s}
            </option>
          )}
        </select>
        {filtered &&
        <button
          type="button"
          onClick={clearFilters}
          className="inline-flex items-center gap-1 px-1 text-xs text-mute transition-colors duration-150 ease-out hover:text-strong">
          
            <XIcon className="h-3 w-3" />
            Clear
          </button>
        }
        <span className="ml-auto font-mono text-2xs text-ink-500">
          {rows.length} of {capabilities.length}
        </span>
      </div>

      <div className="scroll-thin overflow-x-auto border-t border-line">
        <table className="w-full min-w-[1180px] border-collapse text-left">
          <thead>
            <tr className="text-2xs uppercase tracking-[0.14em] text-ink-500">
              <th className="w-24 py-2.5 pr-4 font-medium">ID</th>
              <th className="py-2.5 pr-4 font-medium">Capability</th>
              <th className="w-36 py-2.5 pr-4 font-medium">Group</th>
              <th className="w-52 py-2.5 pr-4 font-medium">Domains</th>
              <th className="w-24 py-2.5 pr-4 font-medium">Epic</th>
              <th className="w-44 py-2.5 pr-4 font-medium">Breakdown</th>
              <th className="w-44 py-2.5 pr-4 font-medium">Progress</th>
              <th className="w-28 py-2.5 pr-4 font-medium">Status</th>
              <th className="w-16 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const counts = countsOf(c.id);
              const track = trackOf(c);
              const ahead = isStageAhead(track, c.progress, counts);
              return (
                <tr
                  key={c.id}
                  tabIndex={0}
                  onClick={() => navigate(`/capabilities/${c.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigate(`/capabilities/${c.id}`);
                  }}
                  className="cursor-pointer border-t border-line-soft align-top transition-colors duration-150 ease-out hover:bg-ink-800">
                  
                  <td className="py-3 pr-4 font-mono text-2xs text-mute">{c.id}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-strong">{c.name}</span>
                      {track === 'hardware' && <Chip tone="aqua">{counts.equipment} equip.</Chip>}
                    </div>
                    <p className="mt-0.5 line-clamp-1 max-w-xl text-xs text-mute">{c.description}</p>
                  </td>
                  <td className="py-3 pr-4 text-xs text-soft">{getGroup(c.groupId)?.name ?? '—'}</td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {c.domainIds.slice(0, 3).map((id) =>
                      <Chip key={id} tone="brand" title={getDomain(id)?.name}>
                          {id}
                        </Chip>
                      )}
                      {c.domainIds.length > 3 &&
                      <span className="text-2xs text-mute">+{c.domainIds.length - 3}</span>
                      }
                    </div>
                  </td>
                  <td className="py-3 pr-4 font-mono text-2xs text-brand-bright">{c.jiraEpic || '—'}</td>
                  <td className="py-3 pr-4">
                    {track === 'hardware' ?
                    c.equipmentIds.length === 0 ?
                    <span className="text-2xs text-ink-500">No equipment</span> :

                    <div className="flex flex-wrap gap-1">
                          {c.equipmentIds.slice(0, 2).map((id) =>
                      <Chip key={id} tone="aqua" title={getEquipment(id)?.name}>
                              {getEquipment(id)?.model ?? id}
                            </Chip>
                      )}
                          {c.equipmentIds.length > 2 &&
                      <span className="text-2xs text-mute">+{c.equipmentIds.length - 2}</span>
                      }
                        </div> :

                    counts.epics === 0 ?
                    <span className="text-2xs text-ink-500">Not broken down</span> :

                    <span className="font-mono text-2xs text-soft">
                        {counts.epics}E · {counts.features}F · {counts.stories}S
                      </span>
                    }
                  </td>
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-1.5">
                      <StagePill track={track} stage={c.progress} />
                      {ahead &&
                      <AlertTriangleIcon
                        className="h-3 w-3 shrink-0 text-warn"
                        aria-label="Progress is ahead of the breakdown" />

                      }
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <StatusTag status={c.status} />
                  </td>
                  <td className="py-3 text-right">
                    <RowActions capability={c} onEdit={openEdit} />
                  </td>
                </tr>);

            })}
          </tbody>
        </table>

        {rows.length === 0 &&
        <div className="border-t border-line-soft py-20 text-center">
            <p className="text-sm text-soft">No capability matches these filters.</p>
            <button
            type="button"
            onClick={clearFilters}
            className="mt-2 text-xs text-brand-bright transition-colors duration-150 ease-out hover:text-strong">
            
              Clear all filters
            </button>
          </div>
        }
      </div>
    </div>);

}