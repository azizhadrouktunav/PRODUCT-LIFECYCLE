import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../components/Primitives';
import { verifyEmailToken } from '../lib/authApi';

const LOGO_URL = '/ChatGPT_Image_Sep_4,_2026,_10_17_13_AM.png';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token) {
        setBusy(false);
        setError('Missing verification token.');
        return;
      }
      try {
        const msg = await verifyEmailToken(token);
        if (!cancelled) setMessage(msg);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="flex min-h-full items-center justify-center bg-ink-900 px-4 py-16">
      <div className="w-full max-w-md border border-line bg-ink-950 p-8 text-center">
        <img src={LOGO_URL} alt="TUNAV" className="mx-auto h-12 w-12 object-contain" />
        <h1 className="mt-4 text-lg font-semibold text-strong">Email verification</h1>
        {busy && <p className="mt-4 text-sm text-mute">Verifying…</p>}
        {!busy && error && <p className="mt-4 text-sm text-danger">{error}</p>}
        {!busy && message && <p className="mt-4 text-sm text-soft">{message}</p>}
        <Link to="/login" className="mt-6 inline-block">
          <Button variant="primary">Go to sign in</Button>
        </Link>
      </div>
    </div>
  );
}
