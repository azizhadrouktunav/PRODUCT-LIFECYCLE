-- Reaffirm CEO as read-only with visibility across all products.
update public.app_roles
set
  sees_all_products = true,
  description = 'Read-only access across all products.'
where slug = 'ceo';

delete from public.app_role_permissions
where role_slug = 'ceo';
