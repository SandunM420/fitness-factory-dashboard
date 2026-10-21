import { useEffect, useState } from 'react';
import { Alert, Button, Checkbox, Loader, Paper, Table, Text, Title } from '@mantine/core';
import { requestJson } from '../api.js';
import { notify } from '../notify.js';

const roleLabel = (role) => role.replace('_', ' ').replace(/^./, (letter) => letter.toUpperCase());

/**
 * Role -> page matrix. The page list comes from the API (api/src/permissions.js),
 * so this grid always matches what the server actually enforces.
 */
export default function RolePermissions() {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    requestJson('/admin/permissions')
      .then((body) => { setData(body); setDraft(body.matrix); })
      .catch((caught) => setError(caught.message));
  }, []);

  const header = (
    <>
      <Title order={3} size="h4">Page access</Title>
      <Text size="sm" c="dimmed" mb="md">
        Which pages each role can open. Enforced by the API, not just hidden from the menu.
        Super admins always see everything. Changes apply the next time the user loads the app.
      </Text>
    </>
  );

  if (error) return <Paper component="section">{header}<Alert color="red" variant="light">{error}</Alert></Paper>;
  if (!data) return <Paper component="section">{header}<Loader size="sm" /></Paper>;

  const toggle = (role, pageId) => {
    setDraft((current) => {
      const pages = current[role] ?? [];
      return { ...current, [role]: pages.includes(pageId) ? pages.filter((id) => id !== pageId) : [...pages, pageId] };
    });
  };

  const changed = (role) =>
    [...(draft[role] ?? [])].sort().join() !== [...(data.matrix[role] ?? [])].sort().join();

  const save = async (role) => {
    setBusy(role);
    try {
      const body = await requestJson(`/admin/permissions/${role}`, { method: 'PUT', body: { pages: draft[role] ?? [] } });
      setData((current) => ({ ...current, matrix: { ...current.matrix, [role]: body.pages } }));
      setDraft((current) => ({ ...current, [role]: body.pages }));
      notify.success(`Saved page access for ${roleLabel(role)}.`);
    } catch (caught) { notify.error(caught.message); }
    finally { setBusy(''); }
  };

  return (
    <Paper component="section">
      {header}
      <Table.ScrollContainer minWidth={560}>
        <Table verticalSpacing="sm" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Page</Table.Th>
              {data.roles.map((role) => <Table.Th key={role} ta="center" w={130}>{roleLabel(role)}</Table.Th>)}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.pages.map((page) => (
              <Table.Tr key={page.id}>
                <Table.Td>
                  <Text size="sm" fw={600}>{page.label}</Text>
                  <Text size="xs" c="dimmed">{page.note ?? page.group}</Text>
                </Table.Td>
                {data.roles.map((role) => (
                  <Table.Td key={role}>
                    <Checkbox mx="auto" w="fit-content"
                      aria-label={`${page.label} for ${roleLabel(role)}`}
                      checked={(draft[role] ?? []).includes(page.id)}
                      disabled={busy === role}
                      onChange={() => toggle(role, page.id)} />
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
          <Table.Tfoot>
            <Table.Tr>
              <Table.Td />
              {data.roles.map((role) => (
                <Table.Td key={role} ta="center">
                  <Button size="xs" disabled={!changed(role)} loading={busy === role} onClick={() => save(role)}>Save</Button>
                </Table.Td>
              ))}
            </Table.Tr>
          </Table.Tfoot>
        </Table>
      </Table.ScrollContainer>
    </Paper>
  );
}
