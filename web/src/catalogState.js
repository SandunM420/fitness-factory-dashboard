/**
 * Local updates to the /catalog/products payload.
 *
 * Saving a sub-product cannot change anything the POS reported - we never write
 * to SQL Server - so the only thing that moves is the variant row itself and
 * the assigned/unassigned figures derived from it. Applying that change locally
 * gives exactly what a refetch would have, without a ~600ms round trip to a
 * database on the other side of the world.
 *
 * Genuinely fresh POS numbers come from the Refresh button.
 */

const keyOf = (itemCode, flavourId, location) => `${itemCode}|${flavourId}|${location}`;

/** Shape a raw stored variant row the way /catalog/products presents it. */
function shape(raw, flavours, productPrice) {
  const flavour = flavours.find((f) => f.id === raw.flavour_id);
  return {
    key: keyOf(raw.item_code, raw.flavour_id, raw.location),
    itemCode: raw.item_code,
    flavourId: raw.flavour_id,
    flavour: flavour?.name ?? 'Unknown',
    variantCode: flavour ? `${raw.item_code}-${flavour.code}` : raw.item_code,
    location: raw.location,
    qty: raw.qty,
    price: raw.price,
    effectivePrice: raw.price ?? productPrice,
    visibleOnWeb: raw.visible_on_web,
    active: raw.active,
  };
}

/** Recompute the assigned / unassigned figures for one product. */
function recount(product, locations) {
  const assigned = {};
  const unassigned = {};
  for (const location of locations) {
    const total = product.variants
      .filter((v) => v.location === location)
      .reduce((sum, v) => sum + v.qty, 0);
    assigned[location] = total;
    unassigned[location] = (product.pos[location] ?? 0) - total;
  }
  return { ...product, assigned, unassigned };
}

/** Insert or replace a variant, returning new data. `raw` is the API's row. */
export function applyVariant(data, raw) {
  if (!data) return data;
  return {
    ...data,
    products: data.products.map((product) => {
      if (product.itemCode !== raw.item_code) return product;
      const next = shape(raw, data.flavours, product.price);
      const others = product.variants.filter((v) => v.key !== next.key);
      return recount({ ...product, variants: [...others, next] }, data.locations);
    }),
  };
}

/** Drop variants by key, returning new data. */
export function removeVariants(data, keys) {
  if (!data) return data;
  const gone = new Set(keys);
  return {
    ...data,
    products: data.products.map((product) => {
      if (!product.variants.some((v) => gone.has(v.key))) return product;
      const variants = product.variants.filter((v) => !gone.has(v.key));
      return recount({ ...product, variants }, data.locations);
    }),
  };
}

/**
 * Run saves so that edits to the SAME product and location go one after
 * another, while different ones run at once.
 *
 * They cannot all run in parallel: the API checks each change against how much
 * POS stock is still unassigned, and two concurrent edits to the same product
 * would both read the old figure and could together exceed it.
 */
export async function saveInGroups(items, run) {
  const groups = new Map();
  for (const item of items) {
    const groupKey = `${item.itemCode}|${item.location}`;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(item);
  }
  const results = await Promise.all([...groups.values()].map(async (group) => {
    const out = [];
    for (const item of group) out.push(await run(item));
    return out;
  }));
  return results.flat();
}
