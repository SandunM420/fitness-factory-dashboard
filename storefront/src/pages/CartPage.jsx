import Link from '../components/Link.jsx';
import { cartLineKey, cartTotals, hydrateCart, MAX_LINE_QUANTITY } from '../cart.js';
import { money, productHref } from '../lib.js';

export default function CartPage({ cart, products, catalogueLoaded, onQuantity, onRemove }) {
  const lines = hydrateCart(cart, products);
  const totals = cartTotals(lines);
  const hasInvalid = catalogueLoaded && lines.some((line) => !line.valid);

  if (cart.length === 0) return <main className="cart-page section-pad narrow">
    <p className="eyebrow">Your bag</p><h1>Your bag is empty</h1>
    <p>Add products to your bag and they will stay here while you continue shopping.</p>
    <Link className="button primary" href="/products">Browse all products</Link>
  </main>;

  return <main className="cart-page section-pad">
    <header className="cart-heading"><div><p className="eyebrow">Your bag</p><h1>Ready when you are.</h1></div><p>{totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'}</p></header>
    <div className="cart-layout">
      <section className="cart-lines" aria-label="Shopping bag items">
        {!catalogueLoaded && <p className="cart-notice" role="status">Checking current prices and availability…</p>}
        {lines.map((line) => {
          const key = cartLineKey(line);
          const product = line.product;
          return <article className={`cart-line${catalogueLoaded && !line.valid ? ' unavailable' : ''}`} key={key}>
            <div className="cart-line-image">{product?.imageUrl ? <img src={product.imageUrl} alt="" width="160" height="180" /> : <span>{product?.brand?.slice(0, 2) || 'FF'}</span>}</div>
            <div className="cart-line-details">
              <p className="eyebrow">{product?.brand || 'Fitness Factory'}</p>
              <h2>{product ? <Link href={productHref(product)}>{product.title}</Link> : `Product ${line.itemCode}`}</h2>
              <p>{[line.size?.label, line.flavour?.name].filter(Boolean).join(' · ') || 'Standard option'}</p>
              {catalogueLoaded && !line.valid && <p className="line-error" role="alert">This selection is no longer available. Remove it or choose another option.</p>}
              <button className="text-button" type="button" onClick={() => onRemove(key)} aria-label={`Remove ${product?.title || line.itemCode}`}>Remove</button>
            </div>
            <label className="quantity-control">Quantity
              <select value={line.quantity} onChange={(event) => onQuantity(key, event.currentTarget.value)} aria-label={`Quantity for ${product?.title || line.itemCode}`}>
                {Array.from({ length: MAX_LINE_QUANTITY }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <strong className="cart-line-total">{line.valid ? money.format(product.price * line.quantity) : '—'}</strong>
          </article>;
        })}
      </section>
      <aside className="order-summary">
        <p className="eyebrow">Order summary</p><h2>{money.format(totals.total)}</h2>
        <dl><div><dt>Subtotal</dt><dd>{money.format(totals.subtotal)}</dd></div><div><dt>Delivery</dt><dd>Calculated at checkout</dd></div></dl>
        <p className="summary-note">Final delivery timing and charges remain provisional until Fitness Factory confirms the policy.</p>
        <Link className={`button primary checkout-button${hasInvalid || !catalogueLoaded ? ' disabled' : ''}`} href={hasInvalid || !catalogueLoaded ? '/cart' : '/checkout'} aria-disabled={hasInvalid || !catalogueLoaded}>{hasInvalid ? 'Review unavailable items' : 'Continue to checkout'}</Link>
        <Link className="continue-link" href="/products">Continue shopping</Link>
        <div className="payment-note"><b>Secure payment boundary</b><span>Visa, Mastercard and Koko. Card details will be entered only with the approved payment provider.</span></div>
      </aside>
    </div>
  </main>;
}
