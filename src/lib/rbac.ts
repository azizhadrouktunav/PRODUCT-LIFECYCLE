import type { Capability, CapabilityStatus, Lifecycle } from '../types/registry';
import { stageIndex } from '../types/registry';

export type AppRole =
  | 'administrator'
  | 'technical_manager'
  | 'project_manager'
  | 'product_owner'
  | 'ceo';

export const APP_ROLES: AppRole[] = [
  'administrator',
  'technical_manager',
  'project_manager',
  'product_owner',
  'ceo',
];

export const ROLE_LABEL: Record<AppRole, string> = {
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

export interface AppProfile {
  userId: string;
  email: string;
  displayName: string;
  role: AppRole;
  productIds: string[];
}

export function isAppRole(value: string): value is AppRole {
  return (APP_ROLES as string[]).includes(value);
}

export function seesAllProducts(role: AppRole | null | undefined): boolean {
  return role === 'administrator' || role === 'ceo';
}

export function isReadOnlyRole(role: AppRole | null | undefined): boolean {
  return role === 'ceo';
}

export function can(role: AppRole | null | undefined, action: RbacAction): boolean {
  if (!role) return false;
  if (role === 'administrator') return true;
  if (role === 'ceo') return false;

  switch (action) {
    case 'edit_all':
    case 'manage_users':
    case 'manage_groups':
    case 'manage_lifecycles':
    case 'manage_actors':
    case 'manage_waves':
    case 'manage_products':
    case 'import_export':
    case 'delete_capability':
      return false;
    case 'manage_equipment':
      return role === 'technical_manager';
    case 'add_capability':
    case 'edit_capability_progress':
      return role === 'product_owner';
    case 'edit_capability':
      return role === 'product_owner';
    case 'edit_story_stage':
      return role === 'project_manager';
    default:
      return false;
  }
}

/** Delivery capability progress stages Product Owner may set. */
const PO_CAPABILITY_STAGES = new Set([
  'Identified',
  'Epic Definition',
  'Feature Definition',
  'User Story Definition',
]);

/** Story stages Project Manager may set (from In Architecture through Released). */
const PM_STORY_STAGES = new Set([
  'In Architecture',
  'In Development',
  'In Testing',
  'Ready for Deploy',
  'Released',
]);

export function canSetCapabilityProgress(
  role: AppRole | null | undefined,
  stage: string
): boolean {
  if (role === 'administrator') return true;
  if (role === 'product_owner') return PO_CAPABILITY_STAGES.has(stage);
  return false;
}

export function canSetStoryStage(role: AppRole | null | undefined, stage: string): boolean {
  if (role === 'administrator') return true;
  if (role === 'project_manager') return PM_STORY_STAGES.has(stage);
  return false;
}

export function capabilityVisibleToUser(
  capability: Pick<Capability, 'productIds'>,
  role: AppRole | null | undefined,
  assignedProductIds: string[]
): boolean {
  if (seesAllProducts(role)) return true;
  if (assignedProductIds.length === 0) return false;
  const set = new Set(assignedProductIds);
  return (capability.productIds ?? []).some((id) => set.has(id));
}

export function productVisibleToUser(
  productId: string,
  role: AppRole | null | undefined,
  assignedProductIds: string[]
): boolean {
  if (seesAllProducts(role)) return true;
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

export function navVisible(
  path: string,
  role: AppRole | null | undefined
): boolean {
  if (!role) return false;
  if (path === '/users') return role === 'administrator';
  if (role === 'administrator' || role === 'ceo') return true;
  // Non-admin roles: core product surfaces + equipment (TM edits; others read)
  if (
    path === '/' ||
    path === '/products' ||
    path === '/equipment' ||
    path.startsWith('/capabilities')
  ) {
    return true;
  }
  if (path === '/lifecycles' || path === '/groups' || path === '/actors' || path === '/waves') {
    return true; // view allowed; writes gated elsewhere
  }
  return false;
}
