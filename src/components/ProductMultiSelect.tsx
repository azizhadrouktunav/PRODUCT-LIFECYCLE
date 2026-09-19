import { CheckIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRegistry } from '../contexts/RegistryContext';

function toggle(list: string[], id: string, set: (next: string[]) => void) {
  set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
}

/** Required multi-select product chips used on every create/edit form. */
export function ProductMultiSelect({
  productIds,
  onChange,
  emptyHint = 'No products yet. Add products first, then assign them here.',
}: {
  productIds: string[];
  onChange: (next: string[]) => void;
  emptyHint?: string;
}) {
  const { products } = useRegistry();
  const { productVisible } = useAuth();
  const sorted = products
    .filter((p) => productVisible(p.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <span className="mb-1.5 flex items-baseline gap-2 text-xs font-medium text-soft">
        Products <span className="text-brand-bright">*</span>
        <span className="font-normal text-mute">
          {productIds.length > 0 ? `${productIds.length} selected` : 'select one or more'}
        </span>
      </span>
      {sorted.length === 0 ? (
        <p className="rounded-md border border-line-strong bg-ink-900 p-3 text-xs text-mute">
          {emptyHint}
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5 rounded-md border border-line-strong bg-ink-900 p-3">
          {sorted.map((p) => {
            const active = productIds.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(productIds, p.id, onChange)}
                title={p.description}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-2xs transition-colors duration-150 ease-out ${
                  active
                    ? 'border-brand bg-brand/10 text-strong'
                    : 'border-line-strong text-mute hover:text-strong'
                }`}
              >
                <span className="font-mono">{p.id}</span>
                <span className="text-soft">{p.name}</span>
                {active && <CheckIcon className="h-3 w-3 text-brand-bright" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
