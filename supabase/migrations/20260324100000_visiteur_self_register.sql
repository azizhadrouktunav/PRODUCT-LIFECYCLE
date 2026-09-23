-- Visiteur role + email verification for public self-registration.

-- 1) Seed visiteur (no permissions, product-scoped)
insert into public.app_roles (slug, label, description, sees_all_products, is_system)
values (
  'visiteur',
  'Visiteur',
  'Self-registered user. Can submit reclamations; sees only assigned products after activation.',
  false,
  true
)
on conflict (slug) do nothing;

-- 2) Email verification timestamp
alter table public.app_users
  add column if not exists email_verified_at timestamptz;

-- Existing accounts with a password are treated as already verified.
update public.app_users
set email_verified_at = coalesce(email_verified_at, created_at, now())
where password_hash is not null
  and email_verified_at is null;

-- 3) Allow verify tokens
alter table public.app_user_tokens
  drop constraint if exists app_user_tokens_kind_check;

alter table public.app_user_tokens
  add constraint app_user_tokens_kind_check
  check (kind in ('invite', 'reset', 'verify'));

-- 4) Richer status view for admin Users screen
create or replace view public.app_user_status as
select
  u.id as user_id,
  case
    when u.disabled and u.email_verified_at is null then 'unverified'
    when u.disabled then 'pending'
    when u.password_hash is null then 'pending'
    when u.email_verified_at is null then 'unverified'
    else 'active'
  end as status,
  (u.password_hash is not null and not u.disabled and u.email_verified_at is not null) as is_active,
  u.disabled,
  u.email_verified_at,
  u.last_login_at
from public.app_users u
where public.app_has('manage_users') or u.id = public.app_uid();

grant select on public.app_user_status to authenticated;
