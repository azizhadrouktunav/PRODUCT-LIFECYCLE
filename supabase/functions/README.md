# Auth Edge Functions

Authentication is our own: accounts live in `public.app_users` (PBKDF2-SHA256
password hashes), sessions in `public.app_sessions`, and invite / reset links in
`public.app_user_tokens`. Supabase Auth is no longer used. Emails go out through
[Resend](https://resend.com).

## Bootstrap order

1. Apply migrations (including `20260318100000_custom_auth.sql`): `npm run db:migrate`
2. Set the function secrets (see below)
3. Deploy the functions
4. Seed the first administrator: set `SUPABASE_SERVICE_ROLE_KEY` and `SEED_ADMIN_PASSWORD` in `.env`, then `npm run seed:admin`
5. Sign in as that admin → Settings → invite other users

## Secrets

```bash
npx supabase secrets set \
  RESEND_API_KEY=re_xxx \
  RESEND_FROM="TUNAV ONE <noreply@your-verified-domain.com>" \
  APP_BASE_URL=https://tunav-ref.vercel.app \
  --project-ref pxlbuncwdswxisjnszas
```

The sending domain must be verified in Resend. Without a verified domain only
`onboarding@resend.dev` works, and only to your own address.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the Edge runtime.

## Deploy

```bash
npx supabase login
npx supabase functions deploy auth-login --project-ref pxlbuncwdswxisjnszas
npx supabase functions deploy auth-session --project-ref pxlbuncwdswxisjnszas
npx supabase functions deploy auth-logout --project-ref pxlbuncwdswxisjnszas
npx supabase functions deploy auth-set-password --project-ref pxlbuncwdswxisjnszas
npx supabase functions deploy auth-request-reset --project-ref pxlbuncwdswxisjnszas
npx supabase functions deploy invite-user --project-ref pxlbuncwdswxisjnszas
npx supabase functions deploy delete-user --project-ref pxlbuncwdswxisjnszas
npx supabase functions deploy resend-invite --project-ref pxlbuncwdswxisjnszas
npx supabase functions deploy reset-password --project-ref pxlbuncwdswxisjnszas
```

`verify_jwt = false` is set in `supabase/config.toml` for all of them: no Supabase
JWT exists anymore, and the gateway would otherwise reject the browser **OPTIONS**
preflight without CORS headers. Admin endpoints enforce access themselves through
`requirePermission(req, 'manage_users')` in `_shared/auth.ts`, which reads the
`X-Session-Token` header.

## Endpoints

Public (no session):

- **auth-login** — `{ email, password }` → `{ token, expiresAt, user }`
- **auth-set-password** — `{ token, password }` consumes an invite or reset link → `{ token, expiresAt, user }`
- **auth-request-reset** — `{ email }`, always answers `{ ok: true }` (no account enumeration)

Session required:

- **auth-session** — `{}` → `{ user }`, used on app start to restore a session
- **auth-logout** — `{}` revokes the current session

`manage_users` required:

- **invite-user** — `{ email, displayName, role, productIds }` creates the account plus profile and emails a set-password link (valid 7 days)
- **resend-invite** — `{ userId }` issues a fresh invite link (pending users only)
- **reset-password** — `{ userId }` emails a reset link (activated users only, valid 1 hour)
- **delete-user** — `{ userId }` deletes the account; cascades to profile, tokens and sessions. Refuses self-delete and the last administrator

## Shared modules

`_shared/` is bundled automatically with each function:

- `cors.ts` — CORS headers and JSON helpers
- `password.ts` — PBKDF2-SHA256 hash / verify, mirrored by `scripts/seed-admin.mjs`
- `tokens.ts` — random tokens, sha256 storage, TTL constants
- `auth.ts` — session creation and `requireSession` / `requirePermission` guards
- `email.ts` — Resend transport plus invite and reset templates

Account status shown in Settings → Users comes from the `public.app_user_status`
view, so the browser never touches `app_users` (which has no `anon` grants).
