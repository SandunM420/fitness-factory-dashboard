import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon, Alert, Badge, Button, Checkbox, Code, Group, Loader, Modal, NumberInput,
  Paper, ScrollArea, Select, Stack, Table, Text, TextInput, Textarea, Title,
} from '@mantine/core';
import { IconPencil, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';
import { requestJson } from '../api.js';
import { money } from '../format.jsx';
import { notify } from '../notify.js';

const statusColor = { draft: 'gray', active: 'green', archived: 'orange' };
const blankSize = { label: '', value: '', unit: 'g', code: '', sort_order: 0 };

function ProductEditor({ product, categories, units, onClose, onUpdated }) {
  const [draft, setDraft] = useState({
    title: product.website.title ?? product.itemName,
    brand: product.website.brand ?? '',
    category: product.website.category ?? '',
    description: product.website.description ?? '',
    image_url: product.website.image_url ?? '',
    benefits: product.website.benefits ?? '',
    ingredients: product.website.ingredients ?? '',
    usage: product.website.usage ?? '',
    warnings: product.website.warnings ?? '',
    status: product.website.status ?? 'draft',
  });
  const [sizes, setSizes] = useState(product.sizes ?? []);
  const [newSize, setNewSize] = useState(null);
  const [busy, setBusy] = useState('');

  const saveProduct = async () => {
    setBusy('product');
    try {
      const body = await requestJson(`/catalog/products/${encodeURIComponent(product.itemCode)}`, { method: 'PATCH', body: draft });
      onUpdated({ ...product, website: body.product, sizes });
      notify.success('Website product saved.');
    } catch (error) { notify.error(error.message); }
    finally { setBusy(''); }
  };

  const addSize = async () => {
    setBusy('size-new');
    try {
      const body = await requestJson(`/catalog/products/${encodeURIComponent(product.itemCode)}/sizes`, { method: 'POST', body: newSize });
      const next = [...sizes, body.size];
      setSizes(next); setNewSize(null); onUpdated({ ...product, website: product.website, sizes: next });
      notify.success('Size added.');
    } catch (error) { notify.error(error.message); }
    finally { setBusy(''); }
  };

  const toggleSize = async (size) => {
    setBusy(`size-${size.id}`);
    try {
      const body = await requestJson(`/catalog/sizes/${size.id}`, { method: 'PATCH', body: { active: !size.active } });
      const next = sizes.map((item) => item.id === size.id ? body.size : item);
      setSizes(next); onUpdated({ ...product, website: product.website, sizes: next });
    } catch (error) { notify.error(error.message); }
    finally { setBusy(''); }
  };

  const deleteSize = async (size) => {
    setBusy(`size-${size.id}`);
    try {
      await requestJson(`/catalog/sizes/${size.id}`, { method: 'DELETE' });
      const next = sizes.filter((item) => item.id !== size.id);
      setSizes(next); onUpdated({ ...product, website: product.website, sizes: next });
      notify.success('Size deleted.');
    } catch (error) { notify.error(error.message); }
    finally { setBusy(''); }
  };

  return (
    <Modal opened onClose={onClose} size="min(900px, 96vw)" title={<div><Text fw={700}>{product.itemName}</Text><Code>{product.itemCode}</Code></div>}>
      <Stack gap="lg">
        <Alert color="orange" variant="light" title="VinSim remains read-only">
          This editor stores website content and sizes separately. POS name, price and physical stock are never overwritten.
        </Alert>
        <Paper p="md">
          <Title order={3} fz="md" mb="md">Storefront information</Title>
          <Stack>
            <TextInput label="Website title" value={draft.title} maxLength={160}
              onChange={(event) => setDraft({ ...draft, title: event.currentTarget.value })} />
            <Group grow align="end">
              <TextInput label="Brand" value={draft.brand} maxLength={100}
                onChange={(event) => setDraft({ ...draft, brand: event.currentTarget.value })} />
              <Select label="Website category" placeholder="Select category" clearable data={categories}
                value={draft.category || null} onChange={(value) => setDraft({ ...draft, category: value ?? '' })} />
              <Select label="Status" allowDeselect={false} data={[
                { value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' },
              ]} value={draft.status} onChange={(value) => setDraft({ ...draft, status: value })} />
            </Group>
            <Textarea label="Description" minRows={4} maxLength={4000} value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.currentTarget.value })} />
            <TextInput label="Product image URL" description="Temporary placeholders are allowed; replace with approved product photography before launch." value={draft.image_url}
              onChange={(event) => setDraft({ ...draft, image_url: event.currentTarget.value })} />
            <Textarea label="Benefits" description="One benefit per line" minRows={3} maxLength={4000} value={draft.benefits}
              onChange={(event) => setDraft({ ...draft, benefits: event.currentTarget.value })} />
            <Textarea label="Ingredients" minRows={3} maxLength={8000} value={draft.ingredients}
              onChange={(event) => setDraft({ ...draft, ingredients: event.currentTarget.value })} />
            <Textarea label="How to use" minRows={3} maxLength={4000} value={draft.usage}
              onChange={(event) => setDraft({ ...draft, usage: event.currentTarget.value })} />
            <Textarea label="Warnings" minRows={3} maxLength={4000} value={draft.warnings}
              onChange={(event) => setDraft({ ...draft, warnings: event.currentTarget.value })} />
            <Group justify="flex-end"><Button color="orange" loading={busy === 'product'} onClick={saveProduct}>Save product</Button></Group>
          </Stack>
        </Paper>

        <Paper p="md">
          <Group justify="space-between" mb="md"><div><Title order={3} fz="md">Sizes and weights</Title><Text size="xs" c="dimmed">Codes are permanent because they will become part of the website SKU.</Text></div>
            <Button size="xs" variant="light" leftSection={<IconPlus size={15} />} onClick={() => setNewSize({ ...blankSize })} disabled={Boolean(newSize)}>Add size</Button></Group>
          <Stack gap="xs">
            {sizes.length === 0 && !newSize && <Text size="sm" c="dimmed">No sizes have been created for this product.</Text>}
            {sizes.map((size) => (
              <Group key={size.id} wrap="nowrap" p="xs" style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 'var(--mantine-radius-md)' }}>
                <div style={{ flex: 1 }}><Text size="sm" fw={600}>{size.label}</Text><Text size="xs" c="dimmed">{size.value ? `${size.value} ${size.unit}` : size.unit} · SKU segment <Code>{size.code}</Code></Text></div>
                <Checkbox label="Active" checked={size.active} disabled={busy === `size-${size.id}`} onChange={() => toggleSize(size)} />
                <ActionIcon color="red" variant="subtle" loading={busy === `size-${size.id}`} aria-label={`Delete ${size.label}`} onClick={() => deleteSize(size)}><IconTrash size={16} /></ActionIcon>
              </Group>
            ))}
            {newSize && (
              <Group align="end" wrap="wrap" p="sm" style={{ border: '1px solid var(--mantine-color-orange-6)', borderRadius: 'var(--mantine-radius-md)' }}>
                <TextInput label="Display label" placeholder="2 lb" value={newSize.label} onChange={(e) => setNewSize({ ...newSize, label: e.currentTarget.value })} />
                <NumberInput label="Value" min={0} decimalScale={2} value={newSize.value} onChange={(value) => setNewSize({ ...newSize, value })} />
                <Select label="Unit" data={units} value={newSize.unit} onChange={(value) => setNewSize({ ...newSize, unit: value })} />
                <TextInput label="SKU code" placeholder="2LB" maxLength={16} value={newSize.code} onChange={(e) => setNewSize({ ...newSize, code: e.currentTarget.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} />
                <Button size="sm" color="orange" loading={busy === 'size-new'} disabled={!newSize.label || !newSize.code} onClick={addSize}>Save size</Button>
                <Button size="sm" variant="default" disabled={busy === 'size-new'} onClick={() => setNewSize(null)}>Cancel</Button>
              </Group>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Modal>
  );
}

export default function WebsiteCataloguePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => {
    setError('');
    return requestJson('/catalog/products').then(setData).catch((caught) => setError(caught.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    if (!data) return [];
    const query = search.trim().toLowerCase();
    return data.products.filter((product) => !query || [
      product.itemCode, product.itemName, product.website.title, product.website.brand, product.website.category,
    ].some((value) => String(value ?? '').toLowerCase().includes(query)));
  }, [data, search]);

  const updateProduct = (next) => {
    setData((current) => ({ ...current, products: current.products.map((item) => item.itemCode === next.itemCode ? { ...item, ...next } : item) }));
    setEditing((current) => current?.itemCode === next.itemCode ? { ...current, ...next } : current);
  };

  if (!data && !error) return <Loader />;
  if (!data) return <Alert color="red" title="Could not load website catalogue">{error}</Alert>;

  return (
    <Stack gap="lg">
      {editing && <ProductEditor product={editing} categories={data.websiteCategories} units={data.sizeUnits} onClose={() => setEditing(null)} onUpdated={updateProduct} />}
      {error && <Alert color="red">{error}</Alert>}
      <Paper>
        <Group justify="space-between" align="end">
          <div><Title order={2} fz="lg">Website catalogue</Title><Text size="sm" c="dimmed">Enrich read-only VinSim products with storefront content, category and size.</Text></div>
          <Badge color="orange" variant="light">{rows.length} of {data.products.length} products</Badge>
        </Group>
        <TextInput mt="md" placeholder="Search product, code, brand or website category" leftSection={<IconSearch size={16} />}
          value={search} onChange={(event) => setSearch(event.currentTarget.value)} />
      </Paper>
      <Paper p={0} style={{ overflow: 'hidden' }}>
        <ScrollArea>
          <Table verticalSpacing="sm" horizontalSpacing="md" miw={850}>
            <Table.Thead><Table.Tr><Table.Th>POS product</Table.Th><Table.Th>Website title</Table.Th><Table.Th>Brand</Table.Th><Table.Th>Category</Table.Th><Table.Th>Sizes</Table.Th><Table.Th>Price</Table.Th><Table.Th>Status</Table.Th><Table.Th aria-label="Actions" /></Table.Tr></Table.Thead>
            <Table.Tbody>{rows.map((product) => (
              <Table.Tr key={product.itemCode}>
                <Table.Td><Text size="sm" fw={600}>{product.itemName}</Text><Code>{product.itemCode}</Code></Table.Td>
                <Table.Td>{product.website.title || <Text size="sm" c="dimmed">Uses POS name</Text>}</Table.Td>
                <Table.Td>{product.website.brand || '—'}</Table.Td>
                <Table.Td>{product.website.category || '—'}</Table.Td>
                <Table.Td>{product.sizes.length || '—'}</Table.Td>
                <Table.Td>{product.price ? money.format(product.price) : '—'}</Table.Td>
                <Table.Td><Badge color={statusColor[product.website.status] ?? 'gray'} variant="light">{product.website.status}</Badge></Table.Td>
                <Table.Td><ActionIcon variant="default" aria-label={`Edit ${product.itemName}`} onClick={() => setEditing(product)}><IconPencil size={16} /></ActionIcon></Table.Td>
              </Table.Tr>
            ))}</Table.Tbody>
          </Table>
        </ScrollArea>
      </Paper>
    </Stack>
  );
}
