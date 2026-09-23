export type ReclamationCategory = 'technique' | 'produit' | 'it';

export type ReclamationStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

export const RECLAMATION_CATEGORIES: {
  id: ReclamationCategory;
  label: string;
  hint: string;
}[] = [
  {
    id: 'technique',
    label: 'Réclamation technique',
    hint: 'Send to a Technical Manager',
  },
  {
    id: 'produit',
    label: 'Réclamation produit',
    hint: 'Link one or more products',
  },
  {
    id: 'it',
    label: 'Réclamation IT',
    hint: 'Send to a Project Manager',
  },
];

export const RECLAMATION_STATUSES: ReclamationStatus[] = [
  'Open',
  'In Progress',
  'Resolved',
  'Closed',
];

export const RECLAMATION_CATEGORY_LABEL: Record<ReclamationCategory, string> = {
  technique: 'Réclamation technique',
  produit: 'Réclamation produit',
  it: 'Réclamation IT',
};

/** Role slug used for the assignee picker per category. */
export function assigneeRoleForCategory(
  category: ReclamationCategory
): 'technical_manager' | 'project_manager' | null {
  if (category === 'technique') return 'technical_manager';
  if (category === 'it') return 'project_manager';
  return null;
}

export interface Reclamation {
  id: string;
  title: string;
  description: string;
  category: ReclamationCategory;
  status: ReclamationStatus;
  productIds: string[];
  assigneeId: string | null;
  assigneeName: string;
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
  assigneeId: string | null;
  assigneeName: string;
};
