export const CART_STORAGE_KEY = 'ff-cart-v1';
export const MAX_LINE_QUANTITY = 10;

const textId = (value) => String(value ?? '');

export function cartLineKey(line) {
  return [line.itemCode, textId(line.sizeId), textId(line.flavourId)].join('|');
}

export function normalizeCart(value) {
  if (!Array.isArray(value)) return [];
  const lines = new Map();
  for (const item of value) {
    const itemCode = textId(item?.itemCode || item?.product?.itemCode).trim();
    const quantity = Math.min(MAX_LINE_QUANTITY, Math.max(1, Math.trunc(Number(item?.quantity) || 1)));
    if (!itemCode) continue;
    const line = {
      itemCode,
      sizeId: textId(item?.sizeId ?? item?.size),
      flavourId: textId(item?.flavourId ?? item?.flavour),
      quantity,
    };
    const key = cartLineKey(line);
    const existing = lines.get(key);
    lines.set(key, existing ? { ...line, quantity: Math.min(MAX_LINE_QUANTITY, existing.quantity + quantity) } : line);
  }
  return [...lines.values()];
}

export function readCart(storage) {
  try {
    const current = storage.getItem(CART_STORAGE_KEY);
    if (current) return normalizeCart(JSON.parse(current));
    // One-time migration from the product-detail milestone's original key.
    const legacy = storage.getItem('ff-cart');
    return legacy ? normalizeCart(JSON.parse(legacy)) : [];
  } catch {
    return [];
  }
}

export function addCartLine(cart, item) {
  return normalizeCart([...cart, item]);
}

export function updateCartQuantity(cart, key, quantity) {
  const nextQuantity = Math.min(MAX_LINE_QUANTITY, Math.max(0, Math.trunc(Number(quantity) || 0)));
  return nextQuantity === 0
    ? cart.filter((line) => cartLineKey(line) !== key)
    : cart.map((line) => cartLineKey(line) === key ? { ...line, quantity: nextQuantity } : line);
}

export function hydrateCart(cart, products) {
  const productsByCode = new Map(products.map((product) => [product.itemCode, product]));
  return cart.map((line) => {
    const product = productsByCode.get(line.itemCode);
    const size = product?.sizes?.find((item) => textId(item.id) === line.sizeId);
    const flavour = product?.flavours?.find((item) => textId(item.id) === line.flavourId);
    const valid = Boolean(product?.inStock)
      && (!product.sizes?.length || Boolean(size))
      && (!product.flavours?.length || Boolean(flavour));
    return { ...line, product, size, flavour, valid };
  });
}

export function cartTotals(lines) {
  const subtotal = lines.reduce((sum, line) => sum + (line.valid ? Number(line.product.price) * line.quantity : 0), 0);
  return { subtotal, total: subtotal, itemCount: lines.reduce((sum, line) => sum + line.quantity, 0) };
}
