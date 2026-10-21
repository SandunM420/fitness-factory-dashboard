import { useState } from 'react';

export default function LoginPage({ onSignedIn, configurationError }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(configurationError || '');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Unable to sign in');
      onSignedIn(body.user);
    } catch (caught) {
      setError(caught.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand"><span className="brand-mark">FF</span><span>Fitness Factory</span></div>
        <h1 id="login-title">Sign in</h1>
        <p className="muted">Use the account provided by your administrator.</p>
        <form onSubmit={submit}>
          <label>Email address
            <input type="email" autoComplete="username" value={email}
              onChange={(event) => setEmail(event.target.value)} required autoFocus />
          </label>
          <label>Password
            <input type="password" autoComplete="current-password" value={password}
              onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button className="login-submit" type="submit" disabled={loading || Boolean(configurationError)}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}
