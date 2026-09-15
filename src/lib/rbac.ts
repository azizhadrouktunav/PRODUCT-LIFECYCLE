import type { Capability, CapabilityStatus, Lifecycle } from '../types/registry';
import { stageIndex } from '../types/registry';

/** Role slug (DB-backed; seeded system roles + custom). */
export type AppRole = string;

/** Fallback labels for seeded roles before/without a roles fetch. */
export const SYSTEM_ROLE_LABEL: Record<string, string> = {
  administrator: 'Administrator',
  technical_manager: 'Technical Manager',
  project_manager: 'Project Manager',
  product_owner: 'Product Owner',
  ceo: 'CEO',
};

export type RbacAction =
  | 'edit_all'
  | 'manage_users'
  | 'manage_equipment'
  | 'add_capability'
  | 'edit_capability'
  | 'delete_capability'
  | 'edit_capability_progress'
  | 'edit_story_stage'
  | 'manage_groups'
  | 'manage_lifecycles'
  | 'manage_actors'
  | 'manage_waves'
  | 'manage_products'
  | 'import_export';

export const RBAC_ACTIONS: RbacAction[] = [
  'edit_all',
  'manage_users',
  'manage_equipment',
  'add_capability',
  'edit_capability',
  'delete_capability',
  'edit_capability_progress',
  'edit_story_stage',
  'manage_groups',
  'manage_lifecycles',
  'manage_actors',
  'manage_waves',
  'manage_products',
  'import_export',
];

export const ACTION_LABEL: Record<RbacAction, string> = {
  edit_all: 'Edit all (full access shortcut)',
  manage_users: 'Manage users & roles',
  manage_equipment: 'Manage equipment',
  add_capability: 'Add capability',
  edit_capability: 'Edit capability',
  delete_capability: 'Delete capability',
  edit_capability_progress: 'Edit capability progress',
  edit_story_stage: 'Edit story stage',
  manage_groups: 'Manage capability groups',
  manage_lifecycles: 'Manage lifecycles',
  manage_actors: 'Manage actors',
  manage_waves: 'Manage waves',
  manage_products: 'Manage products',
  import_export: 'Import / export',
};

export function isRbacAction(value: string): value is RbacAction {
  return (RBAC_ACTIONS as string[]).includes(value);
}

export interface AppProfile {
  userId: string;
  email: string;
  displayName: string;
  role: AppRole;
  productIds: string[];
  /** Present when loaded with role join. */
  roleLabel?: string;
  seesAllProducts?: boolean;
  permissions?: RbacAction[];
}

export interface AppRoleRecord {
  slug: string;
  label: string;
  description: string;
  seesAllProducts: boolean;
  isSystem: boolean;
  permissions: RbacAction[];
}

export function roleDisplayLabel(
  slug: string | null | undefined,
  roles?: Pick<AppRoleRecord, 'slug' | 'label'>[] | null
): string {
  if (!slug) return '—';
  const fromList = roles?.find((r) => r.slug === slug)?.label;
  if (fromList) return fromList;
  return SYSTEM_ROLE_LABEL[slug] ?? slug;
}

export function canWithPermissions(
  permissions: Iterable<RbacAction> | null | undefined,
  action: RbacAction
): boolean {
  if (!permissions) return false;
  const set = permissions instanceof Set ? permissions : new Set(permissions);
  if (set.size === 0) return false;
  if (set.has('edit_all')) return true;
  return set.has(action);
}

export function seesAllProductsFromFlag(flag: boolean | null | undefined): boolean {
  return !!flag;
}

export function isReadOnlyFromPermissions(
  permissions: Iterable<RbacAction> | null | undefined
): boolean {
  if (!permissions) return true;
  const set = permissions instanceof Set ? permissions : new Set(permissions);
  return set.size === 0;
}

/** Delivery capability progress stages Product Owner–style permission may set. */
const CAPABILITY_PROGRESS_STAGES = new Set([
  'Identified',
  'Epic Definition',
  'Feature Definition',
  'User Story Definition',
]);

/** Story stages Project Manager–style permission may set. */
const STORY_STAGES = new Set([
  'In Architecture',
  'In Development',
  'In Testing',
  'Ready for Deploy',
  'Released',
]);

export function canSetCapabilityProgressWithPermissions(
  permissions: Iterable<RbacAction> | null | undefined,
  stage: string
): boolean {
  if (!canWithPermissions(permissions, 'edit_capability_progress')) return false;
  if (canWithPermissions(permissions, 'edit_all')) return true;
  // Full catalog if they also have edit_story_stage (admin-like custom roles)
  if (canWithPermissions(permissions, 'edit_story_stage')) return true;
  return CAPABILITY_PROGRESS_STAGES.has(stage);
}

export function canSetStoryStageWithPermissions(
  permissions: Iterable<RbacAction> | null | undefined,
  stage: string
): boolean {
  if (!canWithPermissions(permissions, 'edit_story_stage')) return false;
  if (canWithPermissions(permissions, 'edit_all')) return true;
  if (canWithPermissions(permissions, 'edit_capability_progress')) return true;
  return STORY_STAGES.has(stage);
}

export function capabilityVisibleToUser(
  capability: Pick<Capability, 'productIds'>,
  seesAll: boolean,
  assignedProductIds: string[]
): boolean {
  if (seesAll) return true;
  if (assignedProductIds.length === 0) return false;
  const set = new Set(assignedProductIds);
  return (capability.productIds ?? []).some((id) => set.has(id));
}

export function productVisibleToUser(
  productId: string,
  seesAll: boolean,
  assignedProductIds: string[]
): boolean {
  if (seesAll) return true;
  return assignedProductIds.includes(productId);
}

/** Map a progress/stage name to a Status when “Also update Status” is on. */
export function statusFromProgress(
  stage: string,
  lifecycle?: Lifecycle | null
): CapabilityStatus {
  const lower = stage.toLowerCase();
  if (
    lower.includes('released') ||
    lower === 'active' ||
    lower.includes('completed')
  ) {
    return 'Completed';
  }
  if (lifecycle) {
    const idx = stageIndex(lifecycle, stage);
    if (idx <= 0) return 'In Progress';
  }
  if (lower.includes('identified') || lower.includes('ready for assignment')) {
    return 'In Progress';
  }
  return 'In Progress';
}

/** Main product nav: any signed-in profile may see registry pages. */
export function navVisible(
  path: string,
  role: AppRole | null | undefined
): boolean {
  if (!role) return false;
  if (path.startsWith('/settings')) return false;
  return (
    path === '/' ||
    path === '/products' ||
    path === '/equipment' ||
    path.startsWith('/capabilities') ||
    path === '/lifecycles' ||
    path === '/groups' ||
    path === '/actors' ||
    path === '/waves'
  );
}
