import { createTheme } from '@mantine/core';

// Shared commerce-admin design tokens. Dark is the initial scheme, but staff
// can switch to light mode from the header and Mantine persists their choice.
//   dark[7] = --bg, dark[6] = --card, dark[4] = --border, dark[2] = --muted, dark[0] = --text
export const theme = createTheme({
  primaryColor: 'orange',
  primaryShade: { dark: 6 },   // blue[6] = --accent-button
  fontFamily: 'Poppins, system-ui, -apple-system, Segoe UI, sans-serif',
  headings: { fontFamily: 'Poppins, system-ui, -apple-system, Segoe UI, sans-serif', fontWeight: '600' },
  defaultRadius: 'md',
  colors: {
    orange: [
      '#fff4ed', '#ffe5d5', '#ffc8a9', '#ffa376', '#ff7a3f',
      '#f45d22', '#df4216', '#ba3012', '#942812', '#782313',
    ],
    dark: [
      '#f5f7fa', '#c9cfd6', '#9aa3ae', '#5c6570', '#262b33',
      '#1b1f25', '#14171c', '#0b0d10', '#08090b', '#050607',
    ],
  },
  components: {
    Paper: { defaultProps: { withBorder: true, radius: 'lg', p: 'lg' } },
  },
});
