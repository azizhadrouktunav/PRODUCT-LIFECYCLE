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

Create the API key first at https://resend.com/api-keys, then paste its real
value (it starts with `re_`) in place of `<YOUR-RESEND-KEY>` below. Setting the
placeholder itself makes every send fail with
`Resend 401: {"name":"validation_error","message":"API key is invalid"}`.

bash / zsh:

```bash
npx supabase secrets set \
  RESEND_API_KEY=<YOUR-RESEND-KEY> \
  RESEND_FROM="TUNAV ONE <noreply@your-verified-domain.com>" \
  APP_BASE_URL=https://tunav-ref.vercel.app \
  --project-ref pxlbuncwdswxisjnszas
```

PowerShell — keep it on one line; `\` is not a line continuation there and ends
up inside the secret value:

```powershell
npx supabase secrets set RESEND_API_KEY=<YOUR-RESEND-KEY> "RESEND_FROM=TUNAV ONE <noreply@your-verified-domain.com>" APP_BASE_URL=https://tunav-ref.vercel.app --project-ref pxlbuncwdswxisjnszas
```

Secrets are read on each invocation, so changing one needs no redeploy.

The sending domain must be verified in Resend. Without a verified domain only
`RESEND_FROM="TUNAV ONE <onboarding@resend.dev>"` works, and it only delivers to
the email address that owns the Resend account — invites to anyone else come
back as a 403.

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

### Undelivered mail

`invite-user`, `resend-invite` and `reset-password` answer
`{ ok: true, userId, emailed: true }` on a normal send. When Resend refuses the
recipient with a 403 — which it does for every address except the account owner
while no sending domain is verified — the token is still valid, so they answer
`200` with:

```json
{ "ok": true, "userId": "…", "emailed": false, "link": "https://…/set-password?token=…", "emailError": "…" }
```

Settings → Users then shows that link with a Copy button so an administrator can
pass it on manually. The link is only returned to a caller that already holds
`manage_users`, and only when delivery failed. An invalid API key (401) and every
other Resend failure still raise an error instead.

## Shared modules

`_shared/` is bundled automatically with each function:

- `cors.ts` — CORS headers and JSON helpers
- `password.ts` — PBKDF2-SHA256 hash / verify, mirrored by `scripts/seed-admin.mjs`
- `tokens.ts` — random tokens, sha256 storage, TTL constants
- `auth.ts` — session creation and `requireSession` / `requirePermission` guards
- `email.ts` — Resend transport plus invite and reset templates

Account status shown in Settings → Users comes from the `public.app_user_status`
view, so the browser never touches `app_users` (which has no `anon` grants).
