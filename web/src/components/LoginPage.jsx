import { useState } from 'react';
import { Alert, Button, PasswordInput, Stack, TextInput } from '@mantine/core';
import AuthCard from './AuthCard.jsx';

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
    <AuthCard title="Sign in" subtitle="Use the account provided by your administrator.">
      <form onSubmit={submit}>
        <Stack>
          <TextInput label="Email address" type="email" autoComplete="username" required autoFocus
            value={email} onChange={(event) => setEmail(event.currentTarget.value)} />
          <PasswordInput label="Password" autoComplete="current-password" required
            value={password} onChange={(event) => setPassword(event.currentTarget.value)} />
          {error && <Alert color="red" variant="light" role="alert">{error}</Alert>}
          <Button type="submit" fullWidth loading={loading} disabled={Boolean(configurationError)}>Sign in</Button>
        </Stack>
      </form>
    </AuthCard>
  );
}
