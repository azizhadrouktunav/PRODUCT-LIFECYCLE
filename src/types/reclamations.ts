export type ReclamationCategory = 'demande' | 'technique' | 'produit' | 'it' | 'support';

export type ReclamationStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

export type AssigneeRole =
  | 'technical_manager'
  | 'product_owner'
  | 'it_manager'
  | 'administrator';

export const RECLAMATION_CATEGORIES: {
  id: ReclamationCategory;
  label: string;
  hint: string;
}[] = [
  {
    id: 'demande',
    label: 'Demande',
    hint: 'Everyone can create and view it. Assign people who can reply.',
  },
  {
    id: 'technique',
    label: 'Réclamation technique',
    hint: 'Only the assigned Technical Managers can see and treat it.',
  },
  {
    id: 'produit',
    label: 'Réclamation produit',
    hint: 'Only the assigned Product Owners of the selected products can see and treat it.',
  },
  {
    id: 'it',
    label: 'Réclamation IT',
    hint: 'Only the assigned IT Managers can see and treat it.',
  },
  {
    id: 'support',
    label: 'Support',
    hint: 'Administrators only.',
  },
];

export const RECLAMATION_STATUSES: ReclamationStatus[] = [
  'Open',
  'In Progress',
  'Resolved',
  'Closed',
];

export const RECLAMATION_CATEGORY_LABEL: Record<ReclamationCategory, string> = {
  demande: 'Demande',
  technique: 'Réclamation technique',
  produit: 'Réclamation produit',
  it: 'Réclamation IT',
  support: 'Support',
};

/** Role slug used for the assignee picker. Demande accepts any user. */
export function assigneeRoleForCategory(category: ReclamationCategory): AssigneeRole | null {
  if (category === 'technique') return 'technical_manager';
  if (category === 'produit') return 'product_owner';
  if (category === 'it') return 'it_manager';
  if (category === 'support') return 'administrator';
  return null;
}

export function assigneeFieldLabel(category: ReclamationCategory): string {
  switch (category) {
    case 'technique':
      return 'Technical Managers';
    case 'produit':
      return 'Product Owners';
    case 'it':
      return 'IT Managers';
    case 'support':
      return 'Administrators';
    default:
      return 'People who can reply';
  }
}

export interface Reclamation {
  id: string;
  title: string;
  description: string;
  category: ReclamationCategory;
  status: ReclamationStatus;
  productIds: string[];
  assigneeIds: string[];
  assigneeId: string | null;
  assigneeName: string;
  response: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export type ReclamationInput = {
  title: string;
  description: string;
  category: ReclamationCategory;
  status?: ReclamationStatus;
  productIds: string[];
  assigneeIds: string[];
  assigneeName: string;
  response?: string;
};
