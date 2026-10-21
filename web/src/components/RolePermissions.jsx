import { useEffect, useState } from 'react';
import useResizableColumns from '../useResizableColumns.js';
import { requestJson } from '../api.js';

const roleLabel = (role) => role.replace('_', ' ').replace(/^./, (letter) => letter.toUpperCase());

/**
 * Role -> page matrix. The page list comes from the API (api/src/permissions.js),
 * so this grid always matches what the server actually enforces.
 */
export default function RolePermissions() {
  const columnsRef = useResizableColumns('role-permissions');
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    requestJson('/admin/permissions')
      .then((body) => { setData(body); setDraft(body.matrix); })
      .catch((caught) => setError(caught.message));
  }, []);

  if (error && !data) return <section className="card"><h3>Page access</h3><p className="notice error">{error}</p></section>;
  if (!data) return <section className="card"><h3>Page access</h3><p className="muted">Loading…</p></section>;

  const toggle = (role, pageId) => {
    setDraft((current) => {
      const pages = current[role] ?? [];
      return { ...current, [role]: pages.includes(pageId) ? pages.filter((id) => id !== pageId) : [...pages, pageId] };
    });
  };

  const changed = (role) =>
    [...(draft[role] ?? [])].sort().join() !== [...(data.matrix[role] ?? [])].sort().join();

  const save = async (role) => {
    setBusy(role); setError(''); setNotice('');
    try {
      const body = await requestJson(`/admin/permissions/${role}`, { method: 'PUT', body: { pages: draft[role] ?? [] } });
      setData((current) => ({ ...current, matrix: { ...current.matrix, [role]: body.pages } }));
      setDraft((current) => ({ ...current, [role]: body.pages }));
      setNotice(`Saved page access for ${roleLabel(role)}.`);
    } catch (caught) { setError(caught.message); }
    finally { setBusy(''); }
  };

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h3>Page access</h3>
          <p className="small muted">
            Which pages each role can open. Enforced by the API, not just hidden from the menu.
            Super admins always see everything. Changes apply the next time the user loads the app.
          </p>
        </div>
      </div>

      {error && <p className="notice error" role="alert">{error}</p>}
      {notice && <p className="notice success" role="status">{notice}</p>}

      <div className="user-table-wrap">
        <table ref={columnsRef} className="user-table permissions-table">
          <thead>
            <tr>
              <th>Page</th>
              {data.roles.map((role) => <th key={role}>{roleLabel(role)}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.pages.map((page) => (
              <tr key={page.id}>
                <td>
                  <strong>{page.label}</strong>
                  <span>{page.note ?? page.group}</span>
                </td>
                {data.roles.map((role) => (
                  <td key={role} className="permission-cell">
                    <input
                      type="checkbox"
                      aria-label={`${page.label} for ${roleLabel(role)}`}
                      checked={(draft[role] ?? []).includes(page.id)}
                      disabled={busy === role}
                      onChange={() => toggle(role, page.id)}
                    />
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td />
              {data.roles.map((role) => (
                <td key={role} className="permission-cell">
                  <button className="primary-btn" disabled={!changed(role) || busy === role} onClick={() => save(role)}>
                    {busy === role ? 'Saving…' : 'Save'}
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
