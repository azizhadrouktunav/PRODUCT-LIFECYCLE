# Auth Edge Functions

Authentication is our own: accounts live in `public.app_users` (PBKDF2-SHA256
password hashes), sessions in `public.app_sessions`, and invite / reset links in
`public.app_user_tokens`. Supabase Auth is no longer used.

No function sends mail. They mint the set-password link and hand it back to the
administrator's browser, which sends it through
[EmailJS](https://dashboard.emailjs.com) from `src/lib/emailjs.ts`.

## Bootstrap order

1. Set the function secrets (see below), `APP_JWT_SECRET` first
2. Apply migrations (including `20260319100000_rbac_rls.sql`): `npm run db:migrate`
3. Deploy the functions
4. Seed the first administrator: set `SUPABASE_SERVICE_ROLE_KEY` and `SEED_ADMIN_PASSWORD` in `.env`, then `npm run seed:admin`
5. Sign in as that admin → Settings → invite other users

## Secrets

```powershell
npx supabase secrets set APP_BASE_URL=https://tunav-ref.vercel.app --project-ref pxlbuncwdswxisjnszas
npx supabase secrets set "APP_JWT_SECRET=<Dashboard → Settings → JWT Keys → JWT Secret>" --project-ref pxlbuncwdswxisjnszas
```

`APP_JWT_SECRET` signs the access tokens from `_shared/jwt.ts`. Without it
`auth-login`, `auth-session` and `auth-set-password` answer 500, and with the
wrong value every database read comes back empty, because the RLS policies in
`20260319100000_rbac_rls.sql` resolve the caller from that token.

Do not call it `SUPABASE_JWT_SECRET`. The CLI reserves that prefix for the
variables the Edge runtime injects and skips anything else that uses it, with
only a one-line warning. Quote the assignment, too: the secret is base64 and
routinely contains `/`, `+` and `=`.

Secrets are read on each invocation, so changing one needs no redeploy.

`APP_BASE_URL` must point at a host that serves the SPA on every path. The app
is a client-routed Vite build, so `/set-password` only exists in React Router —
`vercel.json` at the repo root rewrites unmatched paths to `/index.html`. Drop
that rewrite (or move to a host without an equivalent) and every invite link
answers `404 NOT_FOUND` before any JavaScript runs.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the Edge runtime.

## EmailJS

One-time dashboard setup at https://dashboard.emailjs.com:

1. **Email Services** — connect the mailbox that recipients should see in the
   From field, `aziz.hadrouk@tunav.com` (Gmail / Outlook OAuth, or Custom SMTP
   with that mailbox's server settings). Copy the **Service ID**.
2. **Email Templates** — create one template shared by both mails and copy its
   **Template ID**. It is a pass-through: the markup lives in
   `src/lib/emailTemplates.ts`, not in the dashboard.
   - To Email: `{{to_email}}`
   - Subject: `{{subject}}`
   - Content (switch the editor to code / HTML): `{{{html}}}` — three braces, so
     EmailJS injects the markup instead of escaping it
   - Reply To: `{{reply_to}}`
3. **Account → General** — copy the **Public Key**.
4. **Account → Security** — add the app origins to the allowed list
   (`https://tunav-ref.vercel.app`, `http://localhost:5173`) so the public key
   cannot be reused elsewhere. Non-browser API access stays off; the send is a
   browser request.

Then fill `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID`,
`VITE_EMAILJS_PUBLIC_KEY` and `VITE_EMAILJS_REPLY_TO` in `.env` (see
`.env.example`) and restart the dev server — Vite only reads `.env` at startup.
For the Vercel deployment, add the same four under Project Settings →
Environment Variables and redeploy. The EmailJS **private** key is never used:
these values ship inside the browser bundle, which is how EmailJS is designed to
work.

## Deploy

Order matters for the RBAC rollout, because each step is broken without the one
before it:

1. `npx supabase secrets set "APP_JWT_SECRET=…"` — the three auth functions
   refuse to answer without it, so setting it after the deploy means a window
   where nobody can sign in
2. Deploy the functions below — they now return `accessToken` as well, which an
   older browser bundle simply ignores
3. Ship the frontend (Vercel) so browsers start sending that token
4. Apply `20260319100000_rbac_rls.sql` (`npm run db:migrate 20260319100000`) —
   from here on a request without the token reads nothing
5. `npm run verify:rbac` — creates a throwaway Technical Manager, checks what it
   can see and write, and rolls the whole transaction back

```bash
npx supabase login
npx supabase functions deploy auth-login --project-ref pxlbuncwdswxisjnszas
npx supabase functions deploy auth-session --project-ref pxlbuncwdswxisjnszas
npx supabase functions deploy auth-logout --project-ref pxlbuncwdswxisjnszas
npx supabase functions deploy auth-set-password --project-ref pxlbuncwdswxisjnszas
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

- **auth-login** — `{ email, password }` → `{ token, expiresAt, accessToken, accessTokenExpiresAt, user }`
- **auth-set-password** — `{ token, password }` consumes an invite or reset link → the same shape

There is no public "forgot password" endpoint. Mail is sent by the browser, so
such an endpoint would have to hand a reset token to an anonymous caller, which
is account takeover by design. Users ask an administrator, who resets them from
Settings → Users.

Session required:

- **auth-session** — `{}` → `{ user, accessToken, accessTokenExpiresAt }`, used on app start to restore a session and afterwards to re-mint the access token
- **auth-logout** — `{}` revokes the current session

`manage_users` required:

- **invite-user** — `{ email, displayName, role, productIds }` creates the account plus profile and issues a set-password link (valid 7 days)
- **resend-invite** — `{ userId }` issues a fresh invite link (pending users only)
- **reset-password** — `{ userId }` issues a reset link (activated users only, valid 1 hour)
- **delete-user** — `{ userId }` deletes the account; cascades to profile, tokens and sessions. Refuses self-delete and the last administrator

### Link handover

The three link-issuing functions all answer:

```json
{ "ok": true, "userId": "…", "email": "…", "displayName": "…", "link": "https://…/set-password?token=…", "expiresAt": "…" }
```

`src/lib/profileApi.ts` composes the mail from `expiresAt` and posts it to
EmailJS. A refused send is not a failure — the token is already stored, so
Settings → Users shows the link with a Copy button and the reason underneath,
and the administrator passes it on by hand. Only a caller holding `manage_users`
ever sees the link.

## Shared modules

`_shared/` is bundled automatically with each function:

- `cors.ts` — CORS headers and JSON helpers
- `password.ts` — PBKDF2-SHA256 hash / verify, mirrored by `scripts/seed-admin.mjs`
- `tokens.ts` — random tokens, sha256 storage, TTL constants
- `auth.ts` — session creation and `requireSession` / `requirePermission` guards
- `links.ts` — `APP_BASE_URL` plus the set-password URL builder
- `jwt.ts` — the one-hour HS256 access token PostgREST identifies the user by

Account status shown in Settings → Users comes from the `public.app_user_status`
view, so the browser never touches `app_users` (which has no grants outside the
service role). The view only returns rows to a caller holding `manage_users`.

## Two tokens, two jobs

The opaque session token lives seven days, is stored hashed in `app_sessions`,
travels as `X-Session-Token` and is what these functions check — revoking a
session is one delete. It is useless to PostgREST, which only understands JWTs.

So the same three functions also mint a one-hour HS256 access token whose `sub`
is the `app_users` id. `src/lib/accessToken.ts` holds it, `src/utils/supabase.ts`
hands it to supabase-js as the `accessToken` option, and the RLS policies read
`request.jwt.claims -> sub` out of it. It is short-lived precisely because
nothing can revoke it early; `auth-session` re-mints it a minute before expiry.

Deploy the functions and `20260319100000_rbac_rls.sql` together: the policies
without the token lock everyone out, and the token without the policies changes
nothing.
