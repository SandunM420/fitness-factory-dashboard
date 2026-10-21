// Number formats and small display helpers shared by every page.
import { Text } from '@mantine/core';

export const num = new Intl.NumberFormat();
export const money = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 });
export const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });

/** "10:42" style time for "updated ..." labels. */
export const shortTime = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** Placeholder for an empty value. */
export const Dash = () => <Text span c="dimmed">–</Text>;

/** Month picker options; '0' means the whole year. */
export const MONTHS = [
  'All months', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
].map((label, index) => ({ value: String(index), label }));
