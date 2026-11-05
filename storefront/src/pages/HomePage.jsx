import { useEffect, useRef, useState } from 'react';
import Link from '../components/Link.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { categories } from '../data/categories.js';

function HeroMedia() {
  const videoRef = useRef(null);
  const [canPlayVideo, setCanPlayVideo] = useState(false);
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const update = () => setCanPlayVideo(!reducedMotion.matches && !connection?.saveData);
    update();
    reducedMotion.addEventListener('change', update);
    connection?.addEventListener?.('change', update);
    return () => { reducedMotion.removeEventListener('change', update); connection?.removeEventListener?.('change', update); };
  }, []);
  useEffect(() => { if (canPlayVideo) videoRef.current?.play().catch(() => {}); else videoRef.current?.pause(); }, [canPlayVideo]);
  return <div className="hero-media" aria-label="Fitness Factory performance training montage">
    <picture><source srcSet="/media/fitness-factory-hero.webp" type="image/webp" /><img src="/media/fitness-factory-hero.jpg" width="1376" height="768" alt="Fitness Factory sports nutrition and training" fetchPriority="high" /></picture>
    {canPlayVideo ? <video ref={videoRef} muted loop playsInline preload="metadata" poster="/media/fitness-factory-hero.jpg" aria-hidden="true"><source src="/media/fitness-factory-hero-loop.mp4" type="video/mp4" /></video> : null}
  </div>;
}

export default function HomePage({ products }) {
  return <>
    <section className="hero section-pad">
      <div className="hero-copy"><p className="eyebrow accent">Fuel the work</p><h1>Stronger starts<br />with what you <em>choose.</em></h1><p>Authentic sports nutrition, performance essentials and expert-selected products—delivered across Sri Lanka.</p><div className="button-row"><Link className="button primary" href="/products">Shop all products</Link><Link className="button ghost" href="/category/protein">Shop protein</Link></div></div>
      <HeroMedia />
      <div className="hero-stats"><span><b>100%</b> Authentic</span><span><b>6</b> Goal-led categories</span><span><b>Islandwide</b> Delivery</span></div>
    </section>
    <section className="section-pad category-section"><div className="section-head"><div><p className="eyebrow">Shop your goal</p><h2>Built for every phase.</h2></div><Link href="/products">View everything →</Link></div><div className="category-grid">{categories.map((category) => <Link key={category.slug} className="category-card" href={`/category/${category.slug}`}><picture><source srcSet={`/media/${category.image}.webp`} type="image/webp" /><img src={`/media/${category.image}.jpg`} width="1024" height="1024" alt="" loading="lazy" decoding="async" /></picture><span>{category.mark}</span><div><h3>{category.name}</h3><p>{category.note}</p></div><b>↗</b></Link>)}</div></section>
    <section className="section-pad featured"><div className="section-head"><div><p className="eyebrow">Featured picks</p><h2>Ready for the next set.</h2></div><Link href="/products">Shop all →</Link></div>{products.length ? <div className="product-grid">{products.slice(0, 4).map((product) => <ProductCard key={product.itemCode} product={product} />)}</div> : <div className="catalogue-empty"><b>Products are being prepared.</b><p>Published catalogue items will appear here automatically.</p></div>}</section>
    <section className="proof section-pad"><p className="eyebrow accent">Why Fitness Factory</p><h2>Real products.<br />Straight answers.<br /><em>Serious support.</em></h2><div><article><b>01</b><h3>Authenticity first</h3><p>Products sourced with care from recognised supplement brands.</p></article><article><b>02</b><h3>Goal-led selection</h3><p>A focused range organised around how you train and recover.</p></article><article><b>03</b><h3>Local support</h3><p>Clear guidance and responsive service here in Sri Lanka.</p></article></div></section>
  </>;
}
