import { useState } from 'react';
import Link from './Link.jsx';
import { categories } from '../data/categories.js';

export default function Layout({ children, theme, setTheme, cartCount }) {
  const [open, setOpen] = useState(false);
  return <div className="site-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <div className="announcement">Islandwide delivery <span /> Authentic products <span /> Secure checkout</div>
    <header className="header">
      <Link className="logo" href="/"><b>FITNESS</b><i>FACTORY</i></Link>
      <button className="icon-button menu-button" type="button" aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen(!open)}><span className="sr-only">Menu</span>☰</button>
      <nav id="site-nav" className={open ? 'nav open' : 'nav'} aria-label="Main navigation">
        <Link href="/products" onClick={() => setOpen(false)}>All Products</Link>
        {categories.map((category) => <Link key={category.slug} href={`/category/${category.slug}`} onClick={() => setOpen(false)}>{category.name}</Link>)}
      </nav>
      <div className="header-actions">
        <Link className="icon-button" href="/search" aria-label="Search">⌕</Link>
        <button className="icon-button" type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '☼' : '☾'}</button>
        <Link className="icon-button" href="/account" aria-label="Account">◎</Link>
        <Link className="cart-link" href="/cart">Bag <span>{cartCount}</span></Link>
      </div>
    </header>
    <main id="main" tabIndex="-1">{children}</main>
    <footer className="footer">
      <div><Link className="logo" href="/"><b>FITNESS</b><i>FACTORY</i></Link><p>Premium sports nutrition and training essentials, selected for Sri Lanka.</p></div>
      <div><h2>Shop</h2><Link href="/products">All products</Link>{categories.slice(0, 4).map((c) => <Link key={c.slug} href={`/category/${c.slug}`}>{c.name}</Link>)}</div>
      <div><h2>Help</h2><Link href="/contact">Contact</Link><Link href="/faq">FAQ</Link><Link href="/delivery">Delivery</Link><Link href="/returns">Returns</Link></div>
      <div><h2>Legal</h2><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><p>Visa · Mastercard · Koko</p></div>
      <small>© {new Date().getFullYear()} Fitness Factory. All rights reserved.</small>
    </footer>
  </div>;
}
