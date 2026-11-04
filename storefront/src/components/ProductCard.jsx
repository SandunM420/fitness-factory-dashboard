import Link from './Link.jsx';
import { money, productHref } from '../lib.js';

export default function ProductCard({ product }) {
  return <article className="product-card">
    <Link className="product-visual" href={productHref(product)} aria-label={`View ${product.title}`}>
      {product.imageUrl ? <img src={product.imageUrl} alt="" loading="lazy" width="480" height="560" /> : <span>{product.brand?.slice(0, 2) || 'FF'}</span>}
      {product.inStock ? <em>In stock</em> : <em className="out">Out of stock</em>}
    </Link>
    <p className="eyebrow">{product.brand}</p>
    <h3><Link href={productHref(product)}>{product.title}</Link></h3>
    <div className="product-meta"><span>{product.sizes?.[0]?.label || 'Select size'}</span><strong>{money.format(product.price)}</strong></div>
  </article>;
}
