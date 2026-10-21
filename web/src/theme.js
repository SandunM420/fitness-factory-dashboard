import { createTheme } from '@mantine/core';

// Mantine theme matched to the CSS tokens in styles.css, so converted pages and
// not-yet-converted pages look like one app. The app is always dark.
//   dark[7] = --bg, dark[6] = --card, dark[4] = --border, dark[2] = --muted, dark[0] = --text
export const theme = createTheme({
  primaryColor: 'blue',
  primaryShade: { dark: 7 },   // #1971c2-ish fill behind white text, like --accent-button
  fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
  defaultRadius: 'md',
  colors: {
    dark: [
      '#f5f7fa', '#c9cfd6', '#9aa3ae', '#5c6570', '#262b33',
      '#1b1f25', '#14171c', '#0b0d10', '#08090b', '#050607',
    ],
  },
  components: {
    Paper: { defaultProps: { withBorder: true, radius: 'lg', p: 'lg' } },
  },
});
