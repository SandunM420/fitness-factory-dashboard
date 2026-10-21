import Icon from './Icon.jsx';
import { visibleMenu } from '../pages/registry.jsx';

export default function Sidebar({ current, parentId, collapsed, mobileOpen, onNavigate, onClose, user }) {
  return (
    <>
      <div className={`sidebar-scrim${mobileOpen ? ' show' : ''}`} onClick={onClose} />
      <aside className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-mark">FF</span>
          <span className="brand-text">Fitness Factory</span>
        </div>

        <nav className="sidebar-nav">
          {visibleMenu(user).map((item) => {
            const target = item.element ? item.id : item.children?.[0]?.id;
            const active = parentId === item.id;
            return (
              <div key={item.id} className={`menu-group${active ? ' active' : ''}`}>
                <button
                  className={`menu-item${active ? ' active' : ''}`}
                  onClick={() => target && onNavigate(target)}
                  title={item.label}
                  aria-current={active && current === item.id ? 'page' : undefined}
                >
                  <Icon name={item.icon} />
                  <span className="menu-label">{item.label}</span>
                </button>

                {item.children?.length > 0 && (
                  <ul className="submenu">
                    {item.children.map((child) => (
                      <li key={child.id}>
                        <button
                          className={`submenu-item${current === child.id ? ' active' : ''}`}
                          onClick={() => onNavigate(child.id)}
                          aria-current={current === child.id ? 'page' : undefined}
                        >
                          {child.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
