import { Button, Group, Modal, Text } from '@mantine/core';

/**
 * Modal confirmation. Escape or the backdrop cancels, and the confirm button
 * takes focus so Enter completes the action without reaching for the mouse.
 */
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', busy, onConfirm, onCancel }) {
  return (
    <Modal opened={open} onClose={() => !busy && onCancel()} title={title} centered
      closeOnClickOutside={!busy} closeOnEscape={!busy}>
      <Text size="sm">{message}</Text>
      <Group justify="flex-end" mt="lg">
        <Button variant="default" disabled={busy} onClick={onCancel}>Cancel</Button>
        <Button color="red" loading={busy} onClick={onConfirm} data-autofocus>{confirmLabel}</Button>
      </Group>
    </Modal>
  );
}
