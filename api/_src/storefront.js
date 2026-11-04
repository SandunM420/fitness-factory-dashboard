// Public, read-only catalogue projection for the customer storefront.
// It deliberately exposes only published merchandising fields, prices and a
// coarse availability flag. POS locations, costs and exact quantities remain private.
import { Router } from 'express';
import { getPool, sql } from './db.js';
import { all, toRow } from './store.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

router.get('/products', wrap(async (_req, res) => {
  const websiteProducts = (await all(`
    SELECT p.item_code, p.title, p.brand, p.category, p.description,
           m.image_url, m.benefits, m.ingredients, m.usage, m.warnings
    FROM website_products p LEFT JOIN product_merchandising m ON m.item_code = p.item_code
    WHERE status = 'active'
    ORDER BY category, title`)).map(toRow);

  if (!websiteProducts.length) {
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    return res.json({ products: [] });
  }

  const codes = websiteProducts.map((product) => product.item_code);
  const placeholders = codes.map((_, index) => `@code${index}`).join(', ');
  const request = (await getPool()).request();
  codes.forEach((code, index) => request.input(`code${index}`, sql.VarChar(40), code));

  const [posResult, sizes, variants, flavours] = await Promise.all([
    request.query(`
      SELECT RTRIM(itcode) AS itemCode, uprice AS price,
             ISNULL(HCM, 0) + ISNULL(One_Galle_Face, 0) + ISNULL(Hill_Street, 0) + ISNULL(Gym_Store, 0) AS totalQty
      FROM dbo.Stock
      WHERE RTRIM(itcode) IN (${placeholders})`),
    all(`SELECT id, item_code, label, value, unit, code FROM product_sizes
         WHERE active = 1 AND item_code IN (${codes.map(() => '?').join(', ')})
         ORDER BY item_code, sort_order, label`, ...codes).then((rows) => rows.map(toRow)),
    all(`SELECT item_code, flavour_id, price, qty FROM product_variants
         WHERE active = 1 AND visible_on_web = 1 AND qty > 0
           AND item_code IN (${codes.map(() => '?').join(', ')})`, ...codes).then((rows) => rows.map(toRow)),
    all('SELECT id, name, code FROM flavours WHERE active = 1').then((rows) => rows.map(toRow)),
  ]);

  const posByCode = new Map(posResult.recordset.map((row) => [row.itemCode, row]));
  const flavourById = new Map(flavours.map((flavour) => [flavour.id, flavour]));
  const products = websiteProducts.flatMap((product) => {
    const pos = posByCode.get(product.item_code);
    if (!pos) return [];
    const ownVariants = variants.filter((variant) => variant.item_code === product.item_code);
    const variantPrices = ownVariants.map((variant) => Number(variant.price)).filter(Number.isFinite);
    const availableFlavours = [...new Map(ownVariants.map((variant) => {
      const flavour = flavourById.get(variant.flavour_id);
      return flavour ? [flavour.id, flavour] : [null, null];
    }).filter(([id]) => id)).values()];
    return [{
      itemCode: product.item_code,
      title: product.title,
      brand: product.brand,
      category: product.category,
      description: product.description,
      price: variantPrices.length ? Math.min(...variantPrices) : Number(pos.price) || 0,
      inStock: ownVariants.reduce((sum, variant) => sum + Number(variant.qty || 0), 0) > 0,
      sizes: sizes.filter((size) => size.item_code === product.item_code).map(({ item_code: _omit, ...size }) => size),
      flavours: availableFlavours,
      imageUrl: product.image_url,
      benefits: product.benefits,
      ingredients: product.ingredients,
      usage: product.usage,
      warnings: product.warnings,
    }];
  });

  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  return res.json({ products });
}));

export default router;
