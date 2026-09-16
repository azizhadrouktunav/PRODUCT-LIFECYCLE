import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button, Field, inputClass } from '../components/Primitives';
import { requestReset } from '../lib/authApi';

const LOGO_URL = '/ChatGPT_Image_Sep_4,_2026,_10_17_13_AM.png';

export function LoginPage() {
  const { signIn, profileMissing, signOut, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'signIn' | 'reset'>('signIn');
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await requestReset(email.trim());
      setNotice(
        'If an active account exists for this address, a reset link is on its way.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (user && profileMissing) {
    return (
      <div className="flex min-h-full items-center justify-center bg-ink-900 px-4 py-16">
        <div className="w-full max-w-md border border-line bg-ink-950 p-8">
          <img src={LOGO_URL} alt="TUNAV" className="mx-auto h-12 w-12 object-contain" />
          <h1 className="mt-4 text-center text-lg font-semibold text-strong">Account not provisioned</h1>
          <p className="mt-2 text-center text-sm text-mute">
            You are signed in as <span className="text-soft">{user.email}</span>, but no profile
            has been assigned yet. Ask an Administrator to add your role and products.
          </p>
          <Button variant="quiet" className="mt-6 w-full" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </div>
    );
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
          {mode === 'signIn' ? (
            <>
              <h1 className="mt-6 text-lg font-semibold text-strong">Sign in</h1>
              <p className="mt-1 text-sm text-mute">
                Use your TUNAV account to open the registry.
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-6 text-lg font-semibold text-strong">Reset password</h1>
              <p className="mt-1 text-sm text-mute">
                We will email you a link to choose a new password.
              </p>
            </>
          )}
        </div>

        {mode === 'signIn' ? (
          <form className="mt-8 space-y-4" onSubmit={(e) => void submit(e)}>
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
            <Field label="Password" required>
              <input
                className={inputClass}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
            {error && <p className="text-xs text-danger">{error}</p>}
            <Button variant="primary" type="submit" disabled={busy || !email || !password} className="w-full">
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
            <button
              type="button"
              className="w-full text-center text-xs text-mute transition-colors duration-150 ease-out hover:text-soft"
              onClick={() => {
                setMode('reset');
                setError(null);
                setNotice(null);
              }}
            >
              Forgot password?
            </button>
          </form>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={(e) => void submitReset(e)}>
            <Field label="Email" required>
              <input
                className={inputClass}
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </Field>
            {error && <p className="text-xs text-danger">{error}</p>}
            {notice && <p className="text-xs text-soft">{notice}</p>}
            <Button
              variant="primary"
              type="submit"
              disabled={busy || !email.includes('@')}
              className="w-full"
            >
              {busy ? 'Sending…' : 'Send reset link'}
            </Button>
            <button
              type="button"
              className="w-full text-center text-xs text-mute transition-colors duration-150 ease-out hover:text-soft"
              onClick={() => {
                setMode('signIn');
                setError(null);
                setNotice(null);
              }}
            >
              Back to sign in
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
