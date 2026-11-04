import test from 'node:test';
import assert from 'node:assert/strict';
import { addCartLine, cartTotals, hydrateCart, normalizeCart, updateCartQuantity } from '../src/cart.js';

const product = { itemCode: 'P1', price: 1000, inStock: true, sizes: [{ id: 1, label: '1 kg' }], flavours: [{ id: 2, name: 'Chocolate' }] };

test('normalization rejects malformed entries and caps merged quantities', () => {
  assert.deepEqual(normalizeCart([null, {}, { itemCode: 'P1', sizeId: 1, flavourId: 2, quantity: 7 }, { product, size: 1, flavour: 2, quantity: 8 }]), [
    { itemCode: 'P1', sizeId: '1', flavourId: '2', quantity: 10 },
  ]);
});

test('adding the same selection merges it and a zero quantity removes it', () => {
  const cart = addCartLine([], { itemCode: 'P1', sizeId: 1, flavourId: 2, quantity: 2 });
  const merged = addCartLine(cart, { itemCode: 'P1', sizeId: 1, flavourId: 2, quantity: 3 });
  assert.equal(merged[0].quantity, 5);
  assert.deepEqual(updateCartQuantity(merged, 'P1|1|2', 0), []);
});

test('hydration validates current catalogue choices and totals only valid lines', () => {
  const lines = hydrateCart([{ itemCode: 'P1', sizeId: '1', flavourId: '2', quantity: 2 }, { itemCode: 'P1', sizeId: '9', flavourId: '2', quantity: 1 }], [product]);
  assert.equal(lines[0].valid, true);
  assert.equal(lines[1].valid, false);
  assert.deepEqual(cartTotals(lines), { subtotal: 2000, total: 2000, itemCount: 3 });
});
