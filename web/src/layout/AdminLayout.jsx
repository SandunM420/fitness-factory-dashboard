import { useEffect, useState } from 'react';
import Sidebar from './Sidebar.jsx';

const STORAGE_KEY = 'ff.sidebar.collapsed';
const readCollapsed = () => {
  try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
};

export default function AdminLayout({ current, parentId, page, onNavigate, user, onSignOut }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0'); } catch { /* private mode */ }
  }, [collapsed]);

  const navigate = (id) => { onNavigate(id); setMobileOpen(false); };

  return (
    <div className={`admin${collapsed ? ' is-collapsed' : ''}`}>
      <Sidebar
        current={current}
        parentId={parentId}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onNavigate={navigate}
        onClose={() => setMobileOpen(false)}
        user={user}
      />

      <div className="admin-main">
        <header className="admin-bar">
          <button className="icon-btn menu-toggle" onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle menu">☰</button>
          <button className="icon-btn collapse-toggle" onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? '»' : '«'}
          </button>
          <div className="admin-bar-title">
            <h1>{page?.title ?? page?.label ?? 'Not found'}</h1>
            {page?.subtitle && <p className="small muted">{page.subtitle}</p>}
          </div>
          <div className="admin-user">
            <span title={`${user.email} (${user.role})`}>{user.email}</span>
            <button type="button" onClick={onSignOut}>Sign out</button>
          </div>
        </header>

        <main className="admin-content">
          {page
            ? page.element
            : <div className="card"><h3>Page not found</h3><p className="muted">Nothing is registered at <code>#{current}</code>.</p></div>}
        </main>
      </div>
    </div>
  );
}
