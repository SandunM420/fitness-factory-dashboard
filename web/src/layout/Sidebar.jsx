import { Group, Menu, NavLink, ScrollArea, Stack, Text, ThemeIcon, Tooltip, UnstyledButton } from '@mantine/core';
import Icon from './Icon.jsx';
import { visibleMenu } from '../pages/registry.jsx';

export function Brand({ collapsed }) {
  return (
    <Group gap="sm" wrap="nowrap" h={64} px="md" style={{ borderBottom: '1px solid var(--mantine-color-dark-4)' }}>
      <ThemeIcon size={32} radius="md" fw={800} fz="sm">FF</ThemeIcon>
      {!collapsed && <Text fw={700} style={{ whiteSpace: 'nowrap' }}>Fitness Factory</Text>}
    </Group>
  );
}

/**
 * Left menu. A parent with sub-pages opens its first child and lists the rest
 * underneath while active. Collapsed to icons, sub-pages open in a flyout.
 */
export default function Sidebar({ current, parentId, collapsed, onNavigate, user }) {
  const items = visibleMenu(user);

  if (collapsed) {
    return (
      <Stack gap={4} p="xs" align="center">
        {items.map((item) => {
          const target = item.element ? item.id : item.children?.[0]?.id;
          const active = parentId === item.id;
          const button = (
            <UnstyledButton onClick={() => target && onNavigate(target)} aria-label={item.label}
              w={44} h={44} style={{
                display: 'grid', placeItems: 'center', borderRadius: 'var(--mantine-radius-md)',
                background: active ? 'var(--mantine-color-blue-6)' : undefined,
                color: active ? 'white' : 'var(--mantine-color-dark-1)',
              }}>
              <Icon name={item.icon} />
            </UnstyledButton>
          );
          if (!item.children?.length) {
            return <Tooltip key={item.id} label={item.label} position="right">{button}</Tooltip>;
          }
          return (
            <Menu key={item.id} trigger="hover" position="right-start" offset={8} openDelay={50} closeDelay={150}>
              <Menu.Target>{button}</Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{item.label}</Menu.Label>
                {item.children.map((child) => (
                  <Menu.Item key={child.id} onClick={() => onNavigate(child.id)}
                    c={current === child.id ? 'blue.4' : undefined}>{child.label}</Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          );
        })}
      </Stack>
    );
  }

  return (
    <ScrollArea p="xs" type="scroll">
      {items.map((item) => {
        const target = item.element ? item.id : item.children?.[0]?.id;
        const active = parentId === item.id;
        const hasChildren = item.children?.length > 0;
        return (
          <NavLink
            key={item.id}
            label={item.label}
            leftSection={<Icon name={item.icon} />}
            active={active && !hasChildren}
            variant="filled"
            opened={hasChildren && active}
            onClick={() => target && onNavigate(target)}
            aria-current={active && current === item.id ? 'page' : undefined}
            fw={active ? 600 : undefined}
            c={active && hasChildren ? 'blue.4' : undefined}
            style={{ borderRadius: 'var(--mantine-radius-md)' }}
            mb={2}
          >
            {hasChildren && item.children.map((child) => (
              <NavLink
                key={child.id}
                label={child.label}
                active={current === child.id}
                variant="light"
                onClick={() => onNavigate(child.id)}
                aria-current={current === child.id ? 'page' : undefined}
                style={{ borderRadius: 'var(--mantine-radius-md)' }}
              />
            ))}
          </NavLink>
        );
      })}
    </ScrollArea>
  );
}
