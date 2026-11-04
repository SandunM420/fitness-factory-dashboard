import { useEffect, useState } from 'react';
import Layout from './components/Layout.jsx';
import HomePage from './pages/HomePage.jsx';
import CataloguePage from './pages/CataloguePage.jsx';
import InfoPage from './pages/InfoPage.jsx';
import ProductPage from './pages/ProductPage.jsx';
import CartPage from './pages/CartPage.jsx';
import { addCartLine, CART_STORAGE_KEY, readCart, updateCartQuantity } from './cart.js';
import { categoryBySlug } from './data/categories.js';
import { getProducts } from './lib.js';

const readTheme = () => localStorage.getItem('ff-theme') === 'light' ? 'light' : 'dark';

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [theme, setThemeState] = useState(readTheme);
  const [products, setProducts] = useState([]);
  const [catalogueLoaded, setCatalogueLoaded] = useState(false);
  const [cart, setCart] = useState(() => readCart(localStorage));
  useEffect(() => { const onPop = () => setPath(window.location.pathname); window.addEventListener('popstate', onPop); return () => window.removeEventListener('popstate', onPop); }, []);
  useEffect(() => { const controller = new AbortController(); getProducts(controller.signal).then(setProducts).catch(() => setProducts([])).finally(() => setCatalogueLoaded(true)); return () => controller.abort(); }, []);
  const setTheme = (next) => { document.documentElement.dataset.theme = next; localStorage.setItem('ff-theme', next); setThemeState(next); };
  const saveCart = (update) => setCart((current) => { const next = update(current); localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next)); localStorage.removeItem('ff-cart'); return next; });
  const addToCart = (item) => saveCart((current) => addCartLine(current, item));
  const updateQuantity = (key, quantity) => saveCart((current) => updateCartQuantity(current, key, quantity));
  const removeLine = (key) => saveCart((current) => updateCartQuantity(current, key, 0));
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  let page;
  if (path === '/') page = <HomePage products={products} />;
  else if (path === '/products' || path === '/search') page = <CataloguePage products={products} />;
  else if (path.startsWith('/category/')) page = <CataloguePage products={products} category={categoryBySlug.get(path.split('/')[2])?.name} />;
  else if (path.startsWith('/product/')) { const product = products.find((p) => path.endsWith(`-${encodeURIComponent(p.itemCode)}`)); page = <ProductPage product={product} products={products} onAdd={addToCart} />; }
  else if (path === '/cart') page = <CartPage cart={cart} products={products} catalogueLoaded={catalogueLoaded} onQuantity={updateQuantity} onRemove={removeLine} />;
  else if (['contact','faq','delivery','returns','privacy','terms'].includes(path.slice(1))) page = <InfoPage type={path.slice(1)} />;
  else page = <InfoPage type="faq" />;
  return <Layout theme={theme} setTheme={setTheme} cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}>{page}</Layout>;
}
