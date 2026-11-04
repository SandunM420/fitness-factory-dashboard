import { Badge, Group, Paper, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconCheck, IconClock, IconLock } from '@tabler/icons-react';

const ICONS = {
  ready: <IconCheck size={18} />,
  planned: <IconClock size={18} />,
  protected: <IconLock size={18} />,
};

/** Visible milestone boundary: navigation is real, business writes are not. */
export default function CommercePlaceholderPage({ title, description, items = [] }) {
  return (
    <Stack gap="lg">
      <Paper p={{ base: 'lg', sm: 'xl' }}>
        <Badge variant="light" color="orange" mb="md">Admin portal foundation</Badge>
        <Title order={2} fz={{ base: 24, sm: 30 }}>{title}</Title>
        <Text c="dimmed" mt="xs" maw={720}>{description}</Text>
      </Paper>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {items.map((item) => (
          <Paper key={item.title} p="lg">
            <Group align="flex-start" wrap="nowrap">
              <ThemeIcon variant="light" color={item.state === 'protected' ? 'orange' : 'gray'}>
                {ICONS[item.state] ?? ICONS.planned}
              </ThemeIcon>
              <div>
                <Text fw={600}>{item.title}</Text>
                <Text size="sm" c="dimmed" mt={4}>{item.text}</Text>
              </div>
            </Group>
          </Paper>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
