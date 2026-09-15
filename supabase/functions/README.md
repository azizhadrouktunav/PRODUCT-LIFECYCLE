# Auth admin Edge Functions

Deploy after applying `20260316100000_app_roles.sql`:

```bash
supabase functions deploy invite-user
supabase functions deploy delete-user
```

Both require the caller’s JWT and a profile role that has `manage_users` or `edit_all`.
They use `SUPABASE_SERVICE_ROLE_KEY` (provided automatically in the Edge runtime) for Auth Admin APIs.

- **invite-user** — body: `{ email, displayName, role, productIds }`
- **delete-user** — body: `{ userId }` (refuses self-delete and last administrator)
