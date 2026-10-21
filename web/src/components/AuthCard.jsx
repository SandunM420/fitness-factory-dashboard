import { Center, Group, Paper, Text, ThemeIcon, Title } from '@mantine/core';

/** Centred card shared by the sign-in and choose-a-password screens. */
export default function AuthCard({ title, subtitle, children }) {
  return (
    <Center mih="100vh" p="md">
      <Paper w="100%" maw={400} p="xl" shadow="xl" component="main">
        <Group gap="sm" mb="lg">
          <ThemeIcon size={32} radius="md" fw={800} fz="sm">FF</ThemeIcon>
          <Text fw={700}>Fitness Factory</Text>
        </Group>
        <Title order={1} fz={28}>{title}</Title>
        <Text c="dimmed" size="sm" mt={4} mb="lg">{subtitle}</Text>
        {children}
      </Paper>
    </Center>
  );
}
