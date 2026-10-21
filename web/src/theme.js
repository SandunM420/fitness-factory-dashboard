import { createTheme } from '@mantine/core';

// The app's colours, fonts and radii. The app is always dark; change the look
// here rather than in individual components.
//   dark[7] = --bg, dark[6] = --card, dark[4] = --border, dark[2] = --muted, dark[0] = --text
export const theme = createTheme({
  primaryColor: 'blue',
  primaryShade: { dark: 6 },   // blue[6] = --accent-button
  fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
  defaultRadius: 'md',
  colors: {
    // blue[4] = --accent-strong, blue[5] = --accent, blue[6] = --accent-button
    blue: [
      '#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa',
      '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a',
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
