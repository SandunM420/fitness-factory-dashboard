import { useEffect, useState } from 'react';
import Layout from './components/Layout.jsx';
import HomePage from './pages/HomePage.jsx';
import CataloguePage from './pages/CataloguePage.jsx';
import InfoPage from './pages/InfoPage.jsx';
import ProductPage from './pages/ProductPage.jsx';
import { categoryBySlug } from './data/categories.js';
import { getProducts } from './lib.js';

const readTheme = () => localStorage.getItem('ff-theme') === 'light' ? 'light' : 'dark';

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [theme, setThemeState] = useState(readTheme);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('ff-cart') || '[]'));
  useEffect(() => { const onPop = () => setPath(window.location.pathname); window.addEventListener('popstate', onPop); return () => window.removeEventListener('popstate', onPop); }, []);
  useEffect(() => { const controller = new AbortController(); getProducts(controller.signal).then(setProducts).catch(() => setProducts([])); return () => controller.abort(); }, []);
  const setTheme = (next) => { document.documentElement.dataset.theme = next; localStorage.setItem('ff-theme', next); setThemeState(next); };
  const addToCart = (item) => setCart((current) => { const next = [...current, item]; localStorage.setItem('ff-cart', JSON.stringify(next)); return next; });
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  let page;
  if (path === '/') page = <HomePage products={products} />;
  else if (path === '/products' || path === '/search') page = <CataloguePage products={products} />;
  else if (path.startsWith('/category/')) page = <CataloguePage products={products} category={categoryBySlug.get(path.split('/')[2])?.name} />;
  else if (path.startsWith('/product/')) { const product = products.find((p) => path.endsWith(`-${encodeURIComponent(p.itemCode)}`)); page = <ProductPage product={product} products={products} onAdd={addToCart} />; }
  else if (['contact','faq','delivery','returns','privacy','terms'].includes(path.slice(1))) page = <InfoPage type={path.slice(1)} />;
  else page = <InfoPage type="faq" />;
  return <Layout theme={theme} setTheme={setTheme} cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}>{page}</Layout>;
}
