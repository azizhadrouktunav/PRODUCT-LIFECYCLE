# Auth admin Edge Functions

## Bootstrap order

1. Apply migrations (including `20260316100000_app_roles.sql`): `npm run db:migrate`
2. Seed the first administrator: set `SUPABASE_SERVICE_ROLE_KEY` and `SEED_ADMIN_PASSWORD` in `.env`, then `npm run seed:admin`
3. Deploy functions below
4. Sign in as that admin → Settings → invite other users

## Deploy

Deploy after applying `20260316100000_app_roles.sql`:

```bash
supabase functions deploy invite-user --project-ref pxlbuncwdswxisjnszas
supabase functions deploy delete-user --project-ref pxlbuncwdswxisjnszas
```

`verify_jwt = false` is set in `supabase/config.toml` for both functions so browser **OPTIONS** preflight succeeds (the API gateway would otherwise return 401 without CORS headers). Each function still validates the caller JWT and requires `manage_users` or `edit_all` via `requireManageUsers`.

They use `SUPABASE_SERVICE_ROLE_KEY` (provided automatically in the Edge runtime) for Auth Admin APIs.

- **invite-user** — body: `{ email, displayName, role, productIds }`
- **delete-user** — body: `{ userId }` (refuses self-delete and last administrator)
