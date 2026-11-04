import {
  IconArrowsExchange, IconChartLine, IconClipboardList, IconDatabase, IconDiscount2,
  IconFile, IconLayoutDashboard, IconPackage, IconSettings, IconShoppingBag, IconUsers,
} from '@tabler/icons-react';

// Menu icon names used in pages/registry.jsx, mapped to Tabler icons
// (https://tabler.io/icons). Unknown names fall back to a page icon.
const ICONS = {
  dashboard: IconLayoutDashboard,
  sales: IconChartLine,
  database: IconDatabase,
  box: IconPackage,
  users: IconUsers,
  settings: IconSettings,
  orders: IconShoppingBag,
  transfers: IconArrowsExchange,
  customers: IconUsers,
  discounts: IconDiscount2,
  content: IconClipboardList,
  page: IconFile,
};

export default function Icon({ name, size = 20 }) {
  const Component = ICONS[name] ?? ICONS.page;
  return <Component size={size} stroke={1.7} aria-hidden="true" />;
}
