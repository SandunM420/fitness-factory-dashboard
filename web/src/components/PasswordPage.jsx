import { useState } from 'react';
import { Alert, Button, PasswordInput, Stack } from '@mantine/core';
import AuthCard from './AuthCard.jsx';

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

  return (
    <AuthCard title="Choose a password" subtitle="Use at least 12 characters and avoid passwords used elsewhere.">
      <form onSubmit={submit}>
        <Stack>
          <PasswordInput label="New password" autoComplete="new-password" minLength={12} required autoFocus
            value={password} onChange={(event) => setPassword(event.currentTarget.value)} />
          <PasswordInput label="Confirm password" autoComplete="new-password" minLength={12} required
            value={confirm} onChange={(event) => setConfirm(event.currentTarget.value)} />
          {error && <Alert color="red" variant="light" role="alert">{error}</Alert>}
          <Button type="submit" fullWidth loading={loading}>Save password</Button>
        </Stack>
      </form>
    </AuthCard>
  );
}
