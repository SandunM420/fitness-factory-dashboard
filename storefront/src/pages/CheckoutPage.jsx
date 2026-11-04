import { useState } from 'react';
import Link from '../components/Link.jsx';
import { hydrateCart, cartTotals } from '../cart.js';
import { money } from '../lib.js';

export default function CheckoutPage({ cart, products, onComplete }) {
  const lines = hydrateCart(cart, products), totals = cartTotals(lines);
  const [state, setState] = useState({ busy: false, error: '', order: null });
  const submit = async (event) => {
    event.preventDefault(); setState({ busy: true, error: '', order: null });
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch('/api/storefront/checkout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, lines: cart }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Checkout could not be completed.');
      onComplete(); setState({ busy: false, error: '', order: body });
    } catch (error) { setState({ busy: false, error: error.message, order: null }); }
  };
  if (state.order) return <main className="page section-pad narrow"><p className="eyebrow">Order reserved</p><h1>Thank you.</h1><h2>{state.order.order.orderNumber}</h2><p>Your order total is {money.format(state.order.order.total)}. No card details were collected. Payment remains pending until the approved Visa/Mastercard or Koko provider is connected.</p><Link className="button primary" href="/account">View order history</Link></main>;
  if (!cart.length) return <main className="page section-pad narrow"><h1>Your bag is empty.</h1><Link className="button primary" href="/products">Browse products</Link></main>;
  return <main className="checkout-page section-pad"><header className="page-heading"><p className="eyebrow">Secure checkout</p><h1>Delivery details.</h1><p>We validate current prices and reserve exact stock on the server. Fitness Factory never receives raw card details.</p></header><div className="checkout-layout">
    <form className="checkout-form" onSubmit={submit}><h2>Contact and delivery</h2><label>Full name<input name="name" autoComplete="name" required maxLength="100" /></label><label>Email<input name="email" type="email" autoComplete="email" required maxLength="254" /></label><label>Phone<input name="phone" type="tel" autoComplete="tel" required maxLength="24" /></label><label>Delivery address<textarea name="address" autoComplete="street-address" required maxLength="300" /></label><label>City<input name="city" autoComplete="address-level2" required maxLength="80" /></label><label>Order note (optional)<textarea name="notes" maxLength="500" /></label><fieldset><legend>Payment method</legend><label className="radio"><input type="radio" name="paymentMethod" value="card" defaultChecked /> Visa or Mastercard</label><label className="radio"><input type="radio" name="paymentMethod" value="koko" /> Koko</label></fieldset>{state.error && <p className="form-error" role="alert">{state.error}</p>}<button className="button primary" disabled={state.busy || lines.some((line) => !line.valid)}>{state.busy ? 'Reserving securely…' : `Reserve order · ${money.format(totals.total)}`}</button><p className="summary-note">Payment provider hand-off is intentionally disabled until approved merchant credentials and final delivery terms are configured.</p></form>
    <aside className="order-summary"><p className="eyebrow">Your order</p>{lines.map((line) => <div className="checkout-line" key={`${line.itemCode}-${line.sizeId}-${line.flavourId}`}><span>{line.quantity} × {line.product?.title}</span><b>{line.valid ? money.format(line.product.price * line.quantity) : 'Unavailable'}</b></div>)}<h2>{money.format(totals.total)}</h2></aside>
  </div></main>;
}
