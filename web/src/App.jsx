import { useEffect, useState } from 'react';
import AdminLayout from './layout/AdminLayout.jsx';
import { DEFAULT_PAGE, findPage, firstPageFor, parentOf } from './pages/registry.jsx';
import LoginPage from './components/LoginPage.jsx';
import PasswordPage from './components/PasswordPage.jsx';

// The open page lives in the URL hash (#today) so refreshing or bookmarking keeps it.
const pageFromHash = () => window.location.hash.slice(1) || DEFAULT_PAGE;

export default function App() {
  const [current, setCurrent] = useState(pageFromHash);
  const [auth, setAuth] = useState({ loading: true, user: null, error: '' });
  const [passwordChanged, setPasswordChanged] = useState(false);
  // A user signed in with a one-time password from an administrator must choose their own first.
  const needsPassword = Boolean(auth.user?.mustChangePassword) && !passwordChanged;

  useEffect(() => {
    fetch('/api/auth/session', { credentials: 'same-origin' })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (response.status === 401) return { user: null, error: '' };
        if (!response.ok) throw new Error(body.error || 'Unable to check your session');
        return { user: body.user, error: '' };
      })
      .then(({ user, error }) => setAuth({ loading: false, user, error }))
      .catch((error) => setAuth({ loading: false, user: null, error: error.message }));
  }, []);

  useEffect(() => {
    const onHash = () => setCurrent(pageFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (id) => { window.location.hash = id; setCurrent(id); };

  // The hash may point at a page this user cannot open (the default is #users,
  // which only a super admin has). Fall back to their first allowed page.
  useEffect(() => {
    if (!auth.user || needsPassword) return;
    if (findPage(current, auth.user)) return;
    const fallback = firstPageFor(auth.user);
    if (fallback && fallback !== current) navigate(fallback);
  }, [auth.user, needsPassword, current]);

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    setAuth({ loading: false, user: null, error: '' });
  };

  if (auth.loading) return <div className="auth-loading">Checking session…</div>;
  if (!auth.user) return <LoginPage configurationError={auth.error} onSignedIn={(user) => setAuth({ loading: false, user, error: '' })} />;
  if (needsPassword) return <PasswordPage onComplete={() => setPasswordChanged(true)} />;
  if (!firstPageFor(auth.user)) return (
    <div className="auth-loading">Your account has no pages enabled yet. Ask an administrator for access.</div>
  );

  return (
    <AdminLayout
      current={current}
      parentId={parentOf(current)?.id}
      page={findPage(current, auth.user)}
      onNavigate={navigate}
      user={auth.user}
      onSignOut={signOut}
    />
  );
}
