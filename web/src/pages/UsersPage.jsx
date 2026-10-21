import { useCallback, useEffect, useState } from 'react';
import {
  Badge, Button, Code, CopyButton, Group, Modal, Paper, Select, Stack, Table, Text, TextInput, Title,
} from '@mantine/core';
import { modals, ModalsProvider } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { requestJson } from '../api.js';
import RolePermissions from '../components/RolePermissions.jsx';

const roleOptions = ['viewer', 'manager', 'admin'].map((value) => ({ value, label: roleLabel(value) }));
const formatDate = (value) => value ? new Date(value).toLocaleString() : 'Never';

const fail = (caught) => notifications.show({ color: 'red', title: 'Something went wrong', message: caught.message });
const done = (message) => notifications.show({ color: 'green', message });

export default function UsersPage() {
  return <ModalsProvider><UsersContent /></ModalsProvider>;
}

function UsersContent() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  // { email, password } while the one-time password dialog is open.
  const [issued, setIssued] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await requestJson('/admin/users');
      setUsers(data.users);
    } catch (caught) {
      fail(caught);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const replaceUser = (user) => setUsers((items) => items.map((item) => item.id === user.id ? user : item));

  const invite = async (event) => {
    event.preventDefault();
    setBusy('invite');
    try {
      const data = await requestJson('/admin/users/invite', { method: 'POST', body: { email, role } });
      setIssued({ email, password: data.tempPassword });
      setEmail(''); setRole('viewer');
      await load();
    } catch (caught) { fail(caught); }
    finally { setBusy(''); }
  };

  const updateRole = async (user, nextRole) => {
    setBusy(user.id);
    try {
      const data = await requestJson(`/admin/users/${user.id}/role`, { method: 'PATCH', body: { role: nextRole } });
      replaceUser(data.user);
      done(`${user.email} is now ${roleLabel(nextRole).toLowerCase()}.`);
    } catch (caught) { fail(caught); }
    finally { setBusy(''); }
  };

  const toggleStatus = (user) => {
    const suspending = !user.suspended;
    modals.openConfirmModal({
      title: suspending ? 'Suspend user' : 'Restore user',
      children: <Text size="sm">{suspending
        ? `${user.email} will be signed out everywhere and will not be able to sign in.`
        : `${user.email} will be able to sign in again.`}</Text>,
      labels: { confirm: suspending ? 'Suspend' : 'Restore', cancel: 'Cancel' },
      confirmProps: { color: suspending ? 'red' : 'blue' },
      onConfirm: async () => {
        setBusy(user.id);
        try {
          const data = await requestJson(`/admin/users/${user.id}/status`, { method: 'PATCH', body: { suspended: suspending } });
          replaceUser(data.user);
          done(`${user.email} was ${suspending ? 'suspended' : 'restored'}.`);
        } catch (caught) { fail(caught); }
        finally { setBusy(''); }
      },
    });
  };

  const resetPassword = (user) => {
    modals.openConfirmModal({
      title: 'Reset password',
      children: <Text size="sm">{user.email} will be signed out everywhere and given a new one-time password.</Text>,
      labels: { confirm: 'Reset password', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        setBusy(user.id);
        try {
          const data = await requestJson(`/admin/users/${user.id}/password-reset`, { method: 'POST' });
          setIssued({ email: user.email, password: data.tempPassword });
          await load();
        } catch (caught) { fail(caught); }
        finally { setBusy(''); }
      },
    });
  };

  return (
    <Stack gap="lg">
      <Paper component="section">
        <Title order={3} size="h4">Add a user</Title>
        <Text size="sm" c="dimmed" mb="md">
          You get a one-time password to pass on; the user chooses their own password at first sign-in.
        </Text>
        <form onSubmit={invite}>
          <Group align="flex-end" wrap="wrap">
            <TextInput type="email" label="Email address" placeholder="name@example.com" required
              value={email} onChange={(event) => setEmail(event.currentTarget.value)} style={{ flex: '1 1 260px' }} />
            <Select label="Role" data={roleOptions} value={role} onChange={(value) => value && setRole(value)}
              allowDeselect={false} w={160} />
            <Button type="submit" loading={busy === 'invite'}>Add user</Button>
          </Group>
        </form>
      </Paper>

      <RolePermissions />

      <Paper component="section">
        <Group justify="space-between" mb="md">
          <div>
            <Title order={3} size="h4">Users</Title>
            <Text size="sm" c="dimmed">Roles and account access are enforced by the API.</Text>
          </div>
          <Button variant="default" onClick={load} loading={loading}>Refresh</Button>
        </Group>

        <Table.ScrollContainer minWidth={720}>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>User</Table.Th><Table.Th>Role</Table.Th><Table.Th>Status</Table.Th>
                <Table.Th>Last sign-in</Table.Th><Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {users.map((user) => (
                <Table.Tr key={user.id}>
                  <Table.Td>
                    <Text fw={600} size="sm">{user.email}</Text>
                    <Text size="xs" c="dimmed">{user.mustChangePassword ? 'One-time password not yet changed' : 'Password set'}</Text>
                  </Table.Td>
                  <Table.Td>
                    {user.role === 'super_admin' ? <Badge variant="light">Super admin</Badge> : (
                      <Select data={roleOptions} value={user.role} allowDeselect={false} size="xs" w={130}
                        disabled={busy === user.id} onChange={(value) => value && value !== user.role && updateRole(user, value)} />
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Badge color={user.suspended ? 'red' : 'green'} variant="light">{user.suspended ? 'Suspended' : 'Active'}</Badge>
                  </Table.Td>
                  <Table.Td><Text size="sm">{formatDate(user.lastSignInAt)}</Text></Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Button size="xs" variant="default" disabled={busy === user.id} onClick={() => resetPassword(user)}>Reset password</Button>
                      <Button size="xs" variant={user.suspended ? 'default' : 'light'} color={user.suspended ? undefined : 'red'}
                        disabled={busy === user.id || user.role === 'super_admin'} onClick={() => toggleStatus(user)}>
                        {user.suspended ? 'Restore' : 'Suspend'}
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      <Modal opened={Boolean(issued)} onClose={() => setIssued(null)} title="One-time password" centered
        closeOnClickOutside={false}>
        {issued && (
          <Stack>
            <Text size="sm">Give this password to <b>{issued.email}</b>. It is shown only once; they will choose their own at first sign-in.</Text>
            <Group justify="space-between" wrap="nowrap">
              <Code fz="lg" p="sm">{issued.password}</Code>
              <CopyButton value={issued.password}>
                {({ copied, copy }) => <Button color={copied ? 'green' : 'blue'} onClick={copy}>{copied ? 'Copied' : 'Copy'}</Button>}
              </CopyButton>
            </Group>
            <Button variant="default" onClick={() => setIssued(null)}>Done</Button>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}

function roleLabel(role) {
  return role.replace('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
}
