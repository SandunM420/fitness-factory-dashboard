export const money = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 });
export const slugify = (value) => String(value ?? '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export async function getProducts(signal) {
  const response = await fetch('/api/storefront/products', { signal, credentials: 'omit', headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('The catalogue is temporarily unavailable.');
  const body = await response.json();
  return Array.isArray(body.products) ? body.products : [];
}
