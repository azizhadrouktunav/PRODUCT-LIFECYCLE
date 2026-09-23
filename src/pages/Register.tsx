import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Field, inputClass } from '../components/Primitives';
import { registerWithEmail } from '../lib/profileApi';

const LOGO_URL = '/ChatGPT_Image_Sep_4,_2026,_10_17_13_AM.png';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ emailed: boolean; link?: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 10) {
      setError('Password must be at least 10 characters');
      return;
    }
    setBusy(true);
    try {
      const outcome = await registerWithEmail({
        email: email.trim().toLowerCase(),
        password,
        displayName: displayName.trim(),
      });
      setDone({
        emailed: outcome.emailed,
        link: outcome.link,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-ink-900 px-4 py-16">
      <div className="w-full max-w-md border border-line bg-ink-950 p-8">
        <div className="text-center">
          <img src={LOGO_URL} alt="TUNAV" className="mx-auto h-12 w-12 object-contain" />
          <p className="mt-3 text-sm font-bold tracking-[0.14em] text-strong">TUNAV ONE</p>
          <p className="text-2xs font-medium tracking-[0.14em] text-brand-bright">
            PRODUCT LIFECYCLE
          </p>
          <h1 className="mt-6 text-lg font-semibold text-strong">Create account</h1>
          <p className="mt-1 text-sm text-mute">
            Register as a Visiteur. Verify your email, then wait for an administrator to activate
            your account and assign products.
          </p>
        </div>

        {done ? (
          <div className="mt-8 space-y-3 text-sm text-soft">
            {done.emailed ? (
              <p>
                Check your inbox at <span className="text-strong">{email.trim()}</span> and click the
                verification link.
              </p>
            ) : (
              <>
                <p>
                  We could not send the email automatically. Use this verification link (or ask an
                  admin to share one):
                </p>
                {done.link && (
                  <code className="block break-all rounded bg-ink-900 px-2 py-1.5 font-mono text-2xs text-mute">
                    {done.link}
                  </code>
                )}
              </>
            )}
            <p className="text-xs text-mute">
              After verification, an administrator must activate your account before you can sign
              in.
            </p>
            <Link
              to="/login"
              className="mt-4 inline-block text-xs text-brand-bright hover:text-strong"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={(e) => void submit(e)}>
            <Field label="Display name">
              <input
                className={inputClass}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
              />
            </Field>
            <Field label="Email" required>
              <input
                className={inputClass}
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Password" required hint="At least 10 characters">
              <input
                className={inputClass}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
            <Field label="Confirm password" required>
              <input
                className={inputClass}
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </Field>
            {error && <p className="text-xs text-danger">{error}</p>}
            <Button
              variant="primary"
              type="submit"
              disabled={busy || !email || !password}
              className="w-full"
            >
              {busy ? 'Creating…' : 'Create account'}
            </Button>
            <p className="text-center text-xs text-mute">
              Already have an account?{' '}
              <Link to="/login" className="text-brand-bright hover:text-strong">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
