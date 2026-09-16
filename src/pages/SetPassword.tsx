import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Field, inputClass } from '../components/Primitives';
import { useAuth } from '../contexts/AuthContext';
import { setPassword as setPasswordRequest } from '../lib/authApi';

const LOGO_URL = '/ChatGPT_Image_Sep_4,_2026,_10_17_13_AM.png';
const MIN_LENGTH = 10;

export function SetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { adoptSession } = useAuth();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tooShort = password.length > 0 && password.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== password;
  const valid = password.length >= MIN_LENGTH && confirm === password;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const result = await setPasswordRequest(token, password);
      await adoptSession(result);
      navigate('/', { replace: true });
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
          <h1 className="mt-6 text-lg font-semibold text-strong">Set your password</h1>
          <p className="mt-1 text-sm text-mute">
            Choose a password of at least {MIN_LENGTH} characters to activate your account.
          </p>
        </div>

        {!token ? (
          <div className="mt-8">
            <p className="text-xs text-danger">
              This link is missing its token. Ask an Administrator to resend your invitation.
            </p>
            <Button
              variant="quiet"
              className="mt-6 w-full"
              onClick={() => navigate('/', { replace: true })}
            >
              Back to sign in
            </Button>
          </div>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={(e) => void submit(e)}>
            <Field label="New password" required>
              <input
                className={inputClass}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
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
            {tooShort && (
              <p className="text-xs text-mute">
                At least {MIN_LENGTH} characters required.
              </p>
            )}
            {mismatch && <p className="text-xs text-danger">Passwords do not match.</p>}
            {error && <p className="text-xs text-danger">{error}</p>}
            <Button
              variant="primary"
              type="submit"
              disabled={busy || !valid}
              className="w-full"
            >
              {busy ? 'Saving…' : 'Set password and sign in'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
