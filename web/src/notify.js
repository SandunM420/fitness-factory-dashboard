import { notifications } from '@mantine/notifications';

// Transient messages in the corner. Errors stay longer so they can be read.
export const notify = {
  success: (message) => notifications.show({ color: 'green', message, autoClose: 3000 }),
  error: (message) => notifications.show({ color: 'red', title: 'Something went wrong', message, autoClose: 8000 }),
};
