# Auth admin Edge Functions

## Bootstrap order

1. Apply migrations (including `20260316100000_app_roles.sql`): `npm run db:migrate`
2. Seed the first administrator: set `SUPABASE_SERVICE_ROLE_KEY` and `SEED_ADMIN_PASSWORD` in `.env`, then `npm run seed:admin`
3. Deploy functions below
4. Sign in as that admin → Settings → invite other users

## Deploy

Deploy after applying `20260316100000_app_roles.sql`:

```bash
supabase functions deploy invite-user
supabase functions deploy delete-user
```

Both require the caller’s JWT and a profile role that has `manage_users` or `edit_all`.
They use `SUPABASE_SERVICE_ROLE_KEY` (provided automatically in the Edge runtime) for Auth Admin APIs.

- **invite-user** — body: `{ email, displayName, role, productIds }`
- **delete-user** — body: `{ userId }` (refuses self-delete and last administrator)
