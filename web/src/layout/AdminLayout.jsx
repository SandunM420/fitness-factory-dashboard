import { useEffect, useState } from 'react';
import { ActionIcon, AppShell, Box, Burger, Button, Code, Group, Paper, Text, Title, Tooltip, useMantineColorScheme } from '@mantine/core';
import { IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand, IconLogout, IconMoon, IconSun } from '@tabler/icons-react';
import Sidebar, { Brand } from './Sidebar.jsx';

const STORAGE_KEY = 'ff.sidebar.collapsed';
const readCollapsed = () => {
  try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
};

export default function AdminLayout({ current, parentId, page, onNavigate, user, onSignOut }) {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0'); } catch { /* private mode */ }
  }, [collapsed]);

  const navigate = (id) => { onNavigate(id); setMobileOpen(false); };

  return (
    <AppShell
      layout="alt"
      header={{ height: 64 }}
      navbar={{ width: collapsed ? 64 : 240, breakpoint: 'sm', collapsed: { mobile: !mobileOpen } }}
      padding="lg"
      styles={{
        navbar: { background: 'var(--mantine-color-dark-8)', color: 'var(--mantine-color-dark-0)', transition: 'width 0.18s ease' },
        header: { background: colorScheme === 'dark' ? 'var(--mantine-color-dark-7)' : 'var(--mantine-color-white)' },
      }}
    >
      <AppShell.Navbar>
        <Group justify="space-between" wrap="nowrap">
          {/* On a phone the menu is a drawer, so it always shows full labels. */}
          <Box visibleFrom="sm"><Brand collapsed={collapsed} /></Box>
          <Box hiddenFrom="sm" style={{ flex: 1 }}><Brand /></Box>
          <Burger hiddenFrom="sm" opened size="sm" mr="md" onClick={() => setMobileOpen(false)} aria-label="Close menu" />
        </Group>
        <Box visibleFrom="sm" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Sidebar current={current} parentId={parentId} collapsed={collapsed} onNavigate={navigate} user={user} />
        </Box>
        <Box hiddenFrom="sm" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Sidebar current={current} parentId={parentId} onNavigate={navigate} user={user} />
        </Box>
      </AppShell.Navbar>

      <AppShell.Header px="md">
        <Group h="100%" gap="sm" wrap="nowrap">
          <Burger hiddenFrom="sm" opened={mobileOpen} onClick={() => setMobileOpen((v) => !v)} size="sm" aria-label="Toggle menu" />
          <Tooltip label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <ActionIcon visibleFrom="sm" variant="default" size="lg" onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              {collapsed ? <IconLayoutSidebarLeftExpand size={18} /> : <IconLayoutSidebarLeftCollapse size={18} />}
            </ActionIcon>
          </Tooltip>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Title order={1} fz={{ base: 'md', sm: 'lg' }} lineClamp={1}>{page?.title ?? page?.label ?? 'Not found'}</Title>
            {page?.subtitle && <Text size="xs" c="dimmed" lineClamp={1} visibleFrom="xs">{page.subtitle}</Text>}
          </Box>
          <Text size="sm" c="dimmed" visibleFrom="md" title={`${user.email} (${user.role})`}>{user.email}</Text>
          <Tooltip label={colorScheme === 'dark' ? 'Use light mode' : 'Use dark mode'}>
            <ActionIcon variant="default" size="lg" onClick={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')}
              aria-label={colorScheme === 'dark' ? 'Use light mode' : 'Use dark mode'}>
              {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
            </ActionIcon>
          </Tooltip>
          <Button variant="default" size="sm" onClick={onSignOut} leftSection={<IconLogout size={16} />}>
            <Box component="span" visibleFrom="xs">Sign out</Box>
          </Button>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        {page
          ? page.element
          : <Paper><Title order={3} size="h4">Page not found</Title><Text c="dimmed">Nothing is registered at <Code>#{current}</Code>.</Text></Paper>}
      </AppShell.Main>
    </AppShell>
  );
}
