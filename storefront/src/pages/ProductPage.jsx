import { useMemo, useState } from 'react';
import Link from '../components/Link.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { money } from '../lib.js';

const lines = (value) => String(value || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);

export default function ProductPage({ product, products, onAdd }) {
  const [size, setSize] = useState(product?.sizes?.[0]?.id ?? '');
  const [flavour, setFlavour] = useState(product?.flavours?.[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const related = useMemo(() => products.filter((p) => p.itemCode !== product?.itemCode && p.category === product?.category).slice(0, 4), [product, products]);
  if (!product) return <section className="page section-pad narrow"><p className="eyebrow">Product</p><h1>Product not found</h1><p>This product may no longer be available.</p><Link className="button primary" href="/products">Browse products</Link></section>;
  const benefits = lines(product.benefits);
  return <>
    <section className="product-detail section-pad">
      <div className="product-gallery">{product.imageUrl ? <img src={product.imageUrl} alt={product.title} width="800" height="900" /> : <div className="product-placeholder" role="img" aria-label={`Temporary image placeholder for ${product.title}`}><b>{product.brand}</b><span>Temporary product image</span></div>}</div>
      <div className="product-buy"><p className="eyebrow">{product.brand} · {product.category}</p><h1>{product.title}</h1><p className="product-price">{money.format(product.price)}</p><p className="product-description">{product.description}</p>
        <fieldset><legend>Size / weight</legend><div className="choice-row">{product.sizes?.map((item) => <label key={item.id}><input type="radio" name="size" value={item.id} checked={String(size) === String(item.id)} onChange={() => setSize(item.id)} /><span>{item.label}</span></label>)}</div></fieldset>
        <fieldset><legend>Flavour</legend><div className="choice-row">{product.flavours?.map((item) => <label key={item.id}><input type="radio" name="flavour" value={item.id} checked={String(flavour) === String(item.id)} onChange={() => setFlavour(item.id)} /><span>{item.name}</span></label>)}</div></fieldset>
        <div className="buy-row"><label>Quantity<input aria-label="Quantity" type="number" min="1" max="10" value={quantity} onChange={(e) => setQuantity(Math.min(10, Math.max(1, Number(e.currentTarget.value) || 1)))} /></label><button className="button primary" type="button" disabled={!product.inStock} onClick={() => onAdd({ product, size, flavour, quantity })}>{product.inStock ? 'Add to cart' : 'Out of stock'}</button></div>
        <div className="trust-strip"><span>Islandwide delivery</span><span>Visa · Mastercard · Koko</span><span>Authentic products</span></div>
      </div>
    </section>
    <section className="product-information section-pad"><div>{benefits.length > 0 && <article><h2>Benefits</h2><ul>{benefits.map((x) => <li key={x}>{x}</li>)}</ul></article>}<article><h2>Ingredients</h2><p>{product.ingredients || 'Full ingredient information will be added by Fitness Factory.'}</p></article><article><h2>How to use</h2><p>{product.usage || 'Follow the directions on the product label.'}</p></article><article><h2>Warnings</h2><p>{product.warnings || 'Consult a qualified healthcare professional before use. Keep out of reach of children.'}</p></article></div><aside><h2>Delivery & payment</h2><p>Islandwide Sri Lankan delivery. Final delivery timing, fees and returns terms are provisional until confirmed.</p><p>Pay securely with Visa, Mastercard or Koko at checkout.</p></aside></section>
    {related.length > 0 && <section className="section-pad"><header className="section-head"><h2>Related products</h2><Link href={`/category/${product.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>View category →</Link></header><div className="product-grid">{related.map((item) => <ProductCard key={item.itemCode} product={item} />)}</div></section>}
  </>;
}
