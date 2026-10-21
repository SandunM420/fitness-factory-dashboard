import { ActionIcon, Button, Group, Text, Tooltip } from '@mantine/core';
import { IconPencil, IconPlus, IconRefresh, IconTrash } from '@tabler/icons-react';
import { shortTime } from '../format.jsx';

/**
 * Toolbar for the line-editing lists: new / edit selected / delete, Save and
 * Cancel while there are unsaved changes, and a count + Refresh on the right.
 * Leave out a handler to hide its button.
 */
export default function LineToolbar({
  onNew, newDisabled, onEdit, editDisabled, onDelete, deleteDisabled,
  dirty, saving, saveDisabled, onSave, onCancel, cancelLabel = 'Cancel',
  info, updatedAt, onRefresh,
}) {
  return (
    <Group gap="xs" mb="sm" wrap="wrap">
      {onNew && (
        <Tooltip label="New line">
          <ActionIcon variant="default" size="lg" aria-label="New line" disabled={newDisabled} onClick={onNew}><IconPlus size={18} /></ActionIcon>
        </Tooltip>
      )}
      {onEdit && (
        <Tooltip label="Edit selected">
          <ActionIcon variant="default" size="lg" aria-label="Edit selected" disabled={editDisabled} onClick={onEdit}><IconPencil size={18} /></ActionIcon>
        </Tooltip>
      )}
      {onDelete && (
        <Tooltip label="Delete selected">
          <ActionIcon variant="default" color="red" size="lg" aria-label="Delete" disabled={deleteDisabled} onClick={onDelete}><IconTrash size={18} /></ActionIcon>
        </Tooltip>
      )}

      {dirty && (
        <>
          <Button size="sm" loading={saving} disabled={saveDisabled} onClick={onSave}>Save</Button>
          <Button size="sm" variant="default" disabled={saving} onClick={onCancel}>{cancelLabel}</Button>
        </>
      )}

      {(info || updatedAt || onRefresh) && (
        <Group gap="sm" ml="auto" wrap="nowrap">
          <Text size="sm" c="dimmed">
            {info}{updatedAt && `${info ? ' · ' : ''}updated ${shortTime(updatedAt)}`}
          </Text>
          {onRefresh && <Button variant="default" size="sm" leftSection={<IconRefresh size={16} />} onClick={onRefresh}>Refresh</Button>}
        </Group>
      )}
    </Group>
  );
}
