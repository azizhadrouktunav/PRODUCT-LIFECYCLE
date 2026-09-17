import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button, Field, inputClass } from '../components/Primitives';

const LOGO_URL = '/ChatGPT_Image_Sep_4,_2026,_10_17_13_AM.png';

export function LoginPage() {
  const { signIn, profileMissing, signOut, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          <h1 className="mt-6 text-lg font-semibold text-strong">Sign in</h1>
          <p className="mt-1 text-sm text-mute">
            Use your TUNAV account to open the registry.
          </p>
        </div>

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
          <p className="text-center text-xs text-mute">
            Forgot your password? Ask an Administrator to send you a reset link.
          </p>
        </form>
      </div>
    </div>
  );
}
