import DashboardPage from './DashboardPage.jsx';
import TodaySales from '../components/TodaySales.jsx';
import SchemaExplorer from '../components/SchemaExplorer.jsx';
import ItemPricesPage from './ItemPricesPage.jsx';
import StockByLocationPage from './StockByLocationPage.jsx';
import UsersPage from './UsersPage.jsx';
import WebsiteStockPage from './WebsiteStockPage.jsx';
import FlavoursPage from './FlavoursPage.jsx';
import SubProductsPage from './SubProductsPage.jsx';
import CommercePlaceholderPage from './CommercePlaceholderPage.jsx';
import WebsiteCataloguePage from './WebsiteCataloguePage.jsx';

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
    id: 'dashboard',
    label: 'Overview',
    icon: 'dashboard',
    title: 'Commerce overview',
    subtitle: 'Sales, stock and operational signals across every location',
    element: <DashboardPage />,
  },
  {
    id: 'orders',
    label: 'Orders',
    icon: 'orders',
    title: 'Online orders',
    subtitle: 'Review payments, reserve exact variants and move accepted orders into transfer',
    element: <CommercePlaceholderPage title="Online orders" description="The order workspace will protect exact flavour-and-weight reservations from payment through delivery."
      items={[
        { title: 'New and paid orders', text: 'A prioritised queue with payment, acceptance and fulfilment states.', state: 'planned' },
        { title: 'Variant reservations', text: 'Reserved units remain unavailable to other customers.', state: 'protected' },
        { title: 'Immutable timeline', text: 'Every staff, payment, stock and delivery event is recorded.', state: 'protected' },
      ]} />,
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
        id: 'catalogue',
        label: 'Website catalogue',
        title: 'Website catalogue',
        subtitle: 'Storefront content, approved categories and size/weight definitions',
        element: <WebsiteCataloguePage />,
      },
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
    id: 'transfers',
    label: 'Transfers',
    icon: 'transfers',
    title: 'Transfer queue',
    subtitle: 'Move accepted online orders from mall stock to the website fulfilment location',
    element: <CommercePlaceholderPage title="Transfer queue" description="Accepted orders remain counted against source stock until their VinSim transfer and invoice references are reconciled."
      items={[
        { title: 'Transfer required', text: 'Accepted orders waiting for a VinSim transfer note.', state: 'planned' },
        { title: 'Invoice confirmation', text: 'Record and verify the destination-location invoice.', state: 'protected' },
        { title: 'Reconciliation exceptions', text: 'Find missing references and stock mismatches before fulfilment.', state: 'protected' },
      ]} />,
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: 'customers',
    title: 'Customers',
    subtitle: 'Orders, addresses, consent and support context with role-aware privacy',
    element: <CommercePlaceholderPage title="Customers" description="A privacy-aware customer workspace will keep order history useful without exposing more personal data than each role needs."
      items={[
        { title: 'Customer profiles', text: 'Contact, addresses and order history in one operational view.', state: 'planned' },
        { title: 'Consent records', text: 'Marketing choices remain separate from transactional communication.', state: 'protected' },
        { title: 'Role-aware masking', text: 'Sensitive values are hidden when a staff role does not require them.', state: 'protected' },
      ]} />,
  },
  {
    id: 'discounts',
    label: 'Discounts',
    icon: 'discounts',
    title: 'Discounts',
    subtitle: 'Controlled codes and automatic offers with eligibility and usage limits',
    element: <CommercePlaceholderPage title="Discounts" description="Promotion rules will be previewable, time-bound and protected against unintended combinations."
      items={[
        { title: 'Discount codes', text: 'Usage, dates, minimums and eligible products.', state: 'planned' },
        { title: 'Automatic offers', text: 'Apply qualified promotions without manual codes.', state: 'planned' },
        { title: 'Rule preview', text: 'Show the effect before a promotion becomes active.', state: 'protected' },
      ]} />,
  },
  {
    id: 'content',
    label: 'Content',
    icon: 'content',
    title: 'Storefront content',
    subtitle: 'Homepage sections, navigation, FAQs and required policy content',
    element: <CommercePlaceholderPage title="Storefront content" description="Staff can maintain essential storefront information without changing code. The five pages removed from scope are not included."
      items={[
        { title: 'Homepage sections', text: 'Manage hero, featured categories and selected product groups.', state: 'planned' },
        { title: 'Navigation', text: 'Maintain All Products and the six approved category links.', state: 'planned' },
        { title: 'Support content', text: 'Contact, FAQ, shipping, returns and legal copy.', state: 'planned' },
      ]} />,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'settings',
    title: 'Settings and access',
    subtitle: 'Locations, markets, delivery, staff roles and security controls',
    children: [
      {
        id: 'store-settings',
        label: 'Store settings',
        title: 'Store settings',
        subtitle: 'Website fulfilment, checkout and operational configuration',
        element: <CommercePlaceholderPage title="Store settings" description="Configuration will be separated by responsibility so operational staff cannot alter security or payment settings accidentally."
          items={[
            { title: 'Locations', text: 'Source malls and the approved website fulfilment destination.', state: 'planned' },
            { title: 'Checkout and delivery', text: 'Currencies, shipping services and order rules.', state: 'planned' },
            { title: 'Security', text: 'Sessions, audit trail and protected integration configuration.', state: 'protected' },
          ]} />,
      },
      {
        id: 'users',
        label: 'Staff and permissions',
        title: 'Staff and permissions',
        subtitle: 'Invite users and control account access',
        allowedRoles: ['super_admin'],
        element: <UsersPage />,
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
