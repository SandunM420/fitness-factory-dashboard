import DashboardPage from './DashboardPage.jsx';
import TodaySales from '../components/TodaySales.jsx';
import SchemaExplorer from '../components/SchemaExplorer.jsx';
import ItemPricesPage from './ItemPricesPage.jsx';
import StockByLocationPage from './StockByLocationPage.jsx';
import UsersPage from './UsersPage.jsx';
import WebsiteStockPage from './WebsiteStockPage.jsx';
import FlavoursPage from './FlavoursPage.jsx';
import SubProductsPage from './SubProductsPage.jsx';

/**
 * The whole admin menu lives here. To add a page:
 *   1. Write the component (e.g. src/pages/StockPage.jsx).
 *   2. Add one entry below: { id, label, icon, title, element: <StockPage /> }.
 * `id` is the URL hash (#stock). Nest sub-pages under `children` — the parent
 * then opens its first child, exactly like the WordPress admin menu.
 * Icons come from src/layout/Icon.jsx; unknown names fall back to a page icon.
 */
export const MENU = [
  {
    id: 'users',
    label: 'Users',
    icon: 'users',
    title: 'User management',
    subtitle: 'Invite users and control account access',
    allowedRoles: ['super_admin'],
    element: <UsersPage />,
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    title: 'Dashboard',
    subtitle: 'Key numbers across both shops',
    element: <DashboardPage />,
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: 'sales',
    children: [
      {
        id: 'today',
        label: "Today's sales",
        title: "Today's sales",
        subtitle: 'Invoices and totals for a single day',
        element: <TodaySales />,
      },
    ],
  },
  {
    id: 'products',
    label: 'Products',
    icon: 'box',
    children: [
      {
        id: 'items',
        label: 'Items & prices',
        title: 'Items & prices',
        subtitle: 'Every product in the catalogue with its cost, selling prices and margin',
        element: <ItemPricesPage />,
      },
      {
        id: 'stock',
        label: 'Stock by location',
        title: 'Stock by location',
        subtitle: 'Quantities held at each location',
        element: <StockByLocationPage />,
      },
      {
        id: 'webstock',
        label: 'Website stock',
        title: 'Website stock',
        subtitle: 'Split the POS stock of each product into flavours, per location',
        element: <WebsiteStockPage />,
      },
      {
        id: 'subproducts',
        label: 'Sub-products',
        title: 'Sub-products',
        subtitle: 'Every flavour created, across all products and locations',
        element: <SubProductsPage />,
      },
      {
        id: 'flavours',
        label: 'Flavours',
        title: 'Flavours',
        subtitle: 'The master flavour list used by the website stock page',
        element: <FlavoursPage />,
      },
    ],
  },
  {
    id: 'explorer',
    label: 'Data explorer',
    icon: 'database',
    title: 'Data explorer',
    subtitle: 'Browse the raw POS tables',
    element: <SchemaExplorer />,
  },
];

/** Every page in menu order, sub-pages included. */
export const PAGES = MENU.flatMap((item) => (item.children?.length ? item.children : item.element ? [item] : []));

export const DEFAULT_PAGE = PAGES[0]?.id ?? 'dashboard';

/**
 * Whether the signed-in user may open a page. `allowedRoles` covers pages tied to a
 * role outright (Users); everything else is driven by the permission matrix, which
 * the API sends as user.pages. This only decides what the menu shows - the API
 * re-checks every request, so editing it in devtools gains nothing.
 */
export const canAccessPage = (page, user) => {
  if (!page) return false;
  if (page.allowedRoles) return page.allowedRoles.includes(user?.role);
  return Boolean(user?.pages?.includes(page.id));
};

export const findPage = (id, user) => {
  const page = PAGES.find((candidate) => candidate.id === id);
  return canAccessPage(page, user) ? page : undefined;
};

/** Menu items the user can see, with unavailable sub-pages removed. */
export const visibleMenu = (user) => MENU
  .map((item) => item.children?.length
    ? { ...item, children: item.children.filter((child) => canAccessPage(child, user)) }
    : item)
  .filter((item) => item.children?.length || (item.element && canAccessPage(item, user)));

/** The first page this user is actually allowed to open. */
export const firstPageFor = (user) => visibleMenu(user)[0]?.children?.[0]?.id ?? visibleMenu(user)[0]?.id;

/** The top-level menu item a page sits under, so the sidebar can highlight it. */
export const parentOf = (id) => MENU.find((item) => item.id === id || item.children?.some((c) => c.id === id));
