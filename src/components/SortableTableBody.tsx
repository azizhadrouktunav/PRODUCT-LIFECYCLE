import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVerticalIcon } from 'lucide-react';
import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from 'react';

export type SortableHandleProps = {
  attributes: ReturnType<typeof useSortable>['attributes'];
  listeners: ReturnType<typeof useSortable>['listeners'];
  setActivatorNodeRef: (element: HTMLElement | null) => void;
};

type SortableItem = { id: string };

type SortableSharedProps<T extends SortableItem> = {
  items: T[];
  disabled?: boolean;
  onReorder: (orderedIds: string[]) => void;
  rowClassName?: string | ((item: T) => string);
  onRowClick?: (item: T, event: MouseEvent<HTMLTableRowElement>) => void;
  onRowKeyDown?: (item: T, event: KeyboardEvent<HTMLTableRowElement>) => void;
};

/** Grip control — drag only from this button. */
export function SortableGripButton({ handle }: { handle: SortableHandleProps | null }) {
  if (!handle) return null;
  return (
    <button
      type="button"
      ref={handle.setActivatorNodeRef}
      className="flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded text-ink-500 hover:bg-panel-2 hover:text-soft active:cursor-grabbing"
      aria-label="Drag to reorder"
      {...handle.attributes}
      {...handle.listeners}
    >
      <GripVerticalIcon className="h-3.5 w-3.5" />
    </button>
  );
}

/** Grip table cell for registry tables. */
export function SortableGrip({ handle }: { handle: SortableHandleProps | null }) {
  return (
    <td className="w-8 py-3 pr-1" onClick={(e) => e.stopPropagation()}>
      <SortableGripButton handle={handle} />
    </td>
  );
}

function useReorderSensors() {
  return useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
}

function reorderIds<T extends SortableItem>(
  items: T[],
  activeId: string | number,
  overId: string | number
): string[] | null {
  if (activeId === overId) return null;
  const oldIndex = items.findIndex((i) => i.id === activeId);
  const newIndex = items.findIndex((i) => i.id === overId);
  if (oldIndex < 0 || newIndex < 0) return null;
  return arrayMove(items, oldIndex, newIndex).map((i) => i.id);
}

function SortableRow<T extends SortableItem>({
  item,
  disabled,
  renderRow,
  rowClassName,
  onRowClick,
  onRowKeyDown,
}: {
  item: T;
  disabled?: boolean;
  renderRow: (item: T, handle: SortableHandleProps | null) => ReactNode;
  rowClassName?: string | ((item: T) => string);
  onRowClick?: (item: T, event: MouseEvent<HTMLTableRowElement>) => void;
  onRowKeyDown?: (item: T, event: KeyboardEvent<HTMLTableRowElement>) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : undefined,
    position: 'relative',
    zIndex: isDragging ? 10 : undefined,
  };

  const handle: SortableHandleProps | null = disabled
    ? null
    : { attributes, listeners, setActivatorNodeRef };

  const extraClass = typeof rowClassName === 'function' ? rowClassName(item) : rowClassName;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      tabIndex={onRowClick || onRowKeyDown ? 0 : undefined}
      onClick={onRowClick ? (e) => onRowClick(item, e) : undefined}
      onKeyDown={onRowKeyDown ? (e) => onRowKeyDown(item, e) : undefined}
      className={`border-t border-line-soft align-top${extraClass ? ` ${extraClass}` : ''}`}
    >
      {renderRow(item, handle)}
    </tr>
  );
}

/**
 * Sortable `<tbody>` for registry tables. Drag activates after a short press on the grip.
 */
export function SortableTableBody<T extends SortableItem>({
  items,
  disabled,
  onReorder,
  renderRow,
  rowClassName,
  onRowClick,
  onRowKeyDown,
}: SortableSharedProps<T> & {
  renderRow: (item: T, handle: SortableHandleProps | null) => ReactNode;
}) {
  const sensors = useReorderSensors();

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const next = reorderIds(items, active.id, over.id);
    if (next) onReorder(next);
  }

  if (disabled) {
    return (
      <tbody>
        {items.map((item) => {
          const extraClass = typeof rowClassName === 'function' ? rowClassName(item) : rowClassName;
          return (
            <tr
              key={item.id}
              tabIndex={onRowClick || onRowKeyDown ? 0 : undefined}
              onClick={onRowClick ? (e) => onRowClick(item, e) : undefined}
              onKeyDown={onRowKeyDown ? (e) => onRowKeyDown(item, e) : undefined}
              className={`border-t border-line-soft align-top${extraClass ? ` ${extraClass}` : ''}`}
            >
              {renderRow(item, null)}
            </tr>
          );
        })}
      </tbody>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <tbody>
          {items.map((item) => (
            <SortableRow
              key={item.id}
              item={item}
              renderRow={renderRow}
              rowClassName={rowClassName}
              onRowClick={onRowClick}
              onRowKeyDown={onRowKeyDown}
            />
          ))}
        </tbody>
      </SortableContext>
    </DndContext>
  );
}

function SortableListItem<T extends SortableItem>({
  item,
  disabled,
  renderItem,
}: {
  item: T;
  disabled?: boolean;
  renderItem: (item: T, handle: SortableHandleProps | null) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : undefined,
    position: 'relative',
    zIndex: isDragging ? 10 : undefined,
  };

  const handle: SortableHandleProps | null = disabled
    ? null
    : { attributes, listeners, setActivatorNodeRef };

  return (
    <div ref={setNodeRef} style={style}>
      {renderItem(item, handle)}
    </div>
  );
}

/** Sortable vertical list for card / sidebar layouts. */
export function SortableList<T extends SortableItem>({
  items,
  disabled,
  onReorder,
  renderItem,
  className,
}: SortableSharedProps<T> & {
  renderItem: (item: T, handle: SortableHandleProps | null) => ReactNode;
  className?: string;
}) {
  const sensors = useReorderSensors();

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const next = reorderIds(items, active.id, over.id);
    if (next) onReorder(next);
  }

  if (disabled) {
    return (
      <div className={className}>
        {items.map((item) => (
          <div key={item.id}>{renderItem(item, null)}</div>
        ))}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {items.map((item) => (
            <SortableListItem key={item.id} item={item} renderItem={renderItem} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
