import { useDeferredValue, useMemo, useState } from 'react';
import ProductCard from '../components/ProductCard.jsx';

export default function CataloguePage({ products, category }) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('featured');
  const query = useDeferredValue(search.trim().toLowerCase());
  const rows = useMemo(() => {
    const filtered = products.filter((product) => (!category || product.category === category)
      && (!query || `${product.title} ${product.brand}`.toLowerCase().includes(query)));
    return [...filtered].sort((a, b) => sort === 'price-low'
      ? a.price - b.price
      : sort === 'price-high' ? b.price - a.price : a.title.localeCompare(b.title));
  }, [products, category, query, sort]);

  return <section className="page section-pad">
    <header className="page-heading"><p className="eyebrow">Catalogue</p><h1>{category || 'All Products'}</h1><p>{category ? `Explore our ${category.toLowerCase()} selection.` : 'Performance nutrition and essentials selected for serious progress.'}</p></header>
    <div className="catalogue-tools"><label>Search products<input type="search" value={search} onChange={(event) => setSearch(event.currentTarget.value)} placeholder="Product or brand" /></label><label>Sort by<select value={sort} onChange={(event) => setSort(event.currentTarget.value)}><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label><p aria-live="polite">{rows.length} product{rows.length === 1 ? '' : 's'}</p></div>
    {rows.length ? <div className="product-grid">{rows.map((product, index) => <ProductCard key={product.itemCode} product={product} priority={index < 4} />)}</div> : <div className="catalogue-empty"><b>No matching products yet.</b><p>Try a different search or browse all products.</p></div>}
  </section>;
}
