import { useEffect, useState } from 'react';
import { Badge, Group, Paper, Select, Stack, Table, Text, Title } from '@mantine/core';
import { getJson, requestJson } from '../api.js';

const choices = ['pending_payment','paid','accepted','processing','shipped','completed','cancelled'].map((value) => ({ value, label: value.replaceAll('_', ' ') }));
const money = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 });
export default function OrdersPage() {
  const [state, setState] = useState({ loading: true, orders: [], error: '' });
  const load = () => getJson('/commerce/orders').then(({ orders }) => setState({ loading: false, orders, error: '' })).catch((error) => setState({ loading: false, orders: [], error: error.message }));
  useEffect(load, []);
  const setStatus = async (id, status) => { try { await requestJson(`/commerce/orders/${id}/status`, { method: 'PATCH', body: { status } }); setState((current) => ({ ...current, orders: current.orders.map((order) => order.id === id ? { ...order, status } : order) })); } catch (error) { setState((current) => ({ ...current, error: error.message })); } };
  return <Stack gap="lg"><Paper p={{ base: 'lg', sm: 'xl' }}><Group justify="space-between"><div><Title order={2}>Online orders</Title><Text c="dimmed">Server-validated reservations and payment state. Raw card data never enters this system.</Text></div><Badge color="orange" variant="light">{state.orders.length} orders</Badge></Group></Paper><Paper p="md" style={{ overflowX: 'auto' }}>{state.error && <Text c="red" mb="md">{state.error}</Text>}{state.loading ? <Text>Loading orders…</Text> : <Table striped highlightOnHover><Table.Thead><Table.Tr><Table.Th>Order</Table.Th><Table.Th>Customer</Table.Th><Table.Th>Total</Table.Th><Table.Th>Payment</Table.Th><Table.Th>Status</Table.Th><Table.Th>Created</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{state.orders.map((order) => <Table.Tr key={order.id}><Table.Td><b>{order.order_number}</b></Table.Td><Table.Td>{order.delivery_name}<Text size="xs" c="dimmed">{order.email} · {order.delivery_phone}</Text></Table.Td><Table.Td>{money.format(order.total)}</Table.Td><Table.Td>{order.payment_method}</Table.Td><Table.Td><Select aria-label={`Status for ${order.order_number}`} data={choices} value={order.status} onChange={(value) => value && setStatus(order.id, value)} w={170} /></Table.Td><Table.Td>{new Date(order.created_at).toLocaleString('en-LK')}</Table.Td></Table.Tr>)}</Table.Tbody></Table>}</Paper></Stack>;
}
