// Recharts styling shared by every chart, in the theme's colours.

// Blue first (brand accent), then white and cool greys/blues that stay distinct on black.
export const CHART_COLORS = ['#3b82f6', '#e5e7eb', '#93c5fd', '#6b7280', '#1d4ed8'];

export const axisTick = { fontSize: 12, fill: 'var(--mantine-color-dark-2)' };
export const gridStroke = 'var(--mantine-color-dark-4)';

export const tooltipProps = {
  contentStyle: {
    background: 'var(--mantine-color-dark-6)', border: '1px solid var(--mantine-color-dark-4)', borderRadius: 8,
    color: 'var(--mantine-color-dark-0)', boxShadow: '0 4px 12px rgb(0 0 0 / 0.5)',
  },
  labelStyle: { color: 'var(--mantine-color-dark-0)', fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: 'var(--mantine-color-dark-0)' },
  cursor: { fill: 'var(--mantine-color-dark-4)', opacity: 0.4 },
};
