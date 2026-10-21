import { useState } from 'react';

export default function PasswordPage({ onComplete }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (password !== confirm) return setError('Passwords do not match');
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/auth/password', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Unable to update password');
      onComplete();
    } catch (caught) { setError(caught.message); }
    finally { setLoading(false); }
  };

  return <main className="login-page"><section className="login-card">
    <div className="login-brand"><span className="brand-mark">FF</span><span>Fitness Factory</span></div>
    <h1>Choose a password</h1><p className="muted">Use at least 12 characters and avoid passwords used elsewhere.</p>
    <form onSubmit={submit}>
      <label>New password<input type="password" autoComplete="new-password" minLength="12" value={password} onChange={(event) => setPassword(event.target.value)} required autoFocus /></label>
      <label>Confirm password<input type="password" autoComplete="new-password" minLength="12" value={confirm} onChange={(event) => setConfirm(event.target.value)} required /></label>
      {error && <p className="login-error" role="alert">{error}</p>}
      <button className="login-submit" disabled={loading}>{loading ? 'Saving…' : 'Save password'}</button>
    </form>
  </section></main>;
}
