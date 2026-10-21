import { Paper, Text, UnstyledButton } from '@mantine/core';

/**
 * A headline number with a label and an optional hint underneath. Pass
 * `onClick` to make the whole card a button (e.g. a filter); `active` then
 * marks the selected one.
 */
export default function StatCard({ label, value, hint, active, onClick, children }) {
  const body = (
    <Paper p="md" h="100%" style={{
      borderLeft: `4px solid var(--mantine-color-blue-${active ? 4 : 6})`,
      background: active ? 'var(--mantine-color-blue-light)' : undefined,
    }}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={0.5}>{label}</Text>
      <Text fz={30} fw={700} style={{ fontVariantNumeric: 'tabular-nums' }} lh={1.3}>{value}</Text>
      {hint && <Text size="xs" c="dimmed" mt={4}>{hint}</Text>}
      {children}
    </Paper>
  );
  if (!onClick) return body;
  return (
    <UnstyledButton onClick={onClick} aria-pressed={active} h="100%" style={{ display: 'block', width: '100%' }}>
      {body}
    </UnstyledButton>
  );
}
