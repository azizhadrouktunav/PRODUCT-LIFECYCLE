# Auth Edge Functions

Authentication is our own: accounts live in `public.app_users` (PBKDF2-SHA256
password hashes), sessions in `public.app_sessions`, and invite / reset links in
`public.app_user_tokens`. Supabase Auth is no longer used.

No function sends mail. They mint the set-password link and hand it back to the
administrator's browser, which sends it through
[EmailJS](https://dashboard.emailjs.com) from `src/lib/emailjs.ts`.

## Bootstrap order

1. Apply migrations (including `20260318100000_custom_auth.sql`): `npm run db:migrate`
2. Set the function secrets (see below)
3. Deploy the functions
4. Seed the first administrator: set `SUPABASE_SERVICE_ROLE_KEY` and `SEED_ADMIN_PASSWORD` in `.env`, then `npm run seed:admin`
5. Sign in as that admin → Settings → invite other users

## Secrets

`APP_BASE_URL` is the only one left:

```powershell
npx supabase secrets set APP_BASE_URL=https://tunav-ref.vercel.app --project-ref pxlbuncwdswxisjnszas
```

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

- **auth-login** — `{ email, password }` → `{ token, expiresAt, user }`
- **auth-set-password** — `{ token, password }` consumes an invite or reset link → `{ token, expiresAt, user }`

There is no public "forgot password" endpoint. Mail is sent by the browser, so
such an endpoint would have to hand a reset token to an anonymous caller, which
is account takeover by design. Users ask an administrator, who resets them from
Settings → Users.

Session required:

- **auth-session** — `{}` → `{ user }`, used on app start to restore a session
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

Account status shown in Settings → Users comes from the `public.app_user_status`
view, so the browser never touches `app_users` (which has no `anon` grants).
