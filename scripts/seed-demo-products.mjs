let getPool;
let sql;
let all;
let batch;

const DEMO_MARKER = '[DEMO-CATALOG-2026]';
const locations = ['HCM', 'One_Galle_Face', 'Hill_Street', 'Gym_Store'];
const products = [
  { itemCode: 'PRT010', title: 'Demo Apex Whey Blend', brand: 'Sample Fuel Co.', category: 'Protein', price: 24900, image: '/demo-products/protein.svg', size: ['850 g', 850, 'g', '850G'], flavours: [['Demo Chocolate', 'DCHOC'], ['Demo Vanilla', 'DVAN']], description: 'Temporary sample protein powder for storefront layout and checkout testing.', benefits: 'Sample copy: convenient protein serving; mixes easily; suitable for a post-training routine.', ingredients: 'Sample ingredients: whey protein blend, cocoa or flavouring, lecithin and sweetener. Not a final label.', usage: 'Sample usage: mix one scoop with 200–250 ml water. Replace with the approved product directions before launch.', warnings: 'DEMO ONLY. Not medical advice. Replace with the supplier-approved allergen and warning statement before sale.' },
  { itemCode: 'PRT034', title: 'Demo Plant Protein Daily', brand: 'Prototype Nutrition', category: 'Protein', price: 21900, image: '/demo-products/protein.svg', size: ['1 kg', 1, 'kg', '1KG'], flavours: [['Demo Cocoa', 'DCOCOA'], ['Demo Vanilla', 'DVAN']], description: 'Temporary sample plant-protein listing used to test catalogue content and variants.', benefits: 'Sample copy: plant-based protein option; smooth everyday shake; simple serving format.', ingredients: 'Sample ingredients: pea protein, rice protein, flavouring and sweetener. Not a final label.', usage: 'Sample usage: blend one scoop with water or a preferred beverage.', warnings: 'DEMO ONLY. Replace ingredients, allergens and directions with verified packaging information.' },
  { itemCode: 'CRT002', title: 'Demo Pure Creatine Mono', brand: 'Sample Strength Lab', category: 'Creatine', price: 9900, image: '/demo-products/creatine.svg', size: ['300 g', 300, 'g', '300G'], flavours: [['Demo Unflavoured', 'DUNFL']], description: 'Temporary sample creatine listing for preview and admin editing.', benefits: 'Sample copy: simple single-ingredient format; easy to add to a daily drink.', ingredients: 'Sample ingredient: creatine monohydrate. Confirm the final supplier label before publication.', usage: 'Sample usage: mix one measured serving with water once daily.', warnings: 'DEMO ONLY. Consult a qualified professional where appropriate. Replace with approved label text.' },
  { itemCode: 'CRT012', title: 'Demo Creatine Refresh', brand: 'Prototype Nutrition', category: 'Creatine', price: 10900, image: '/demo-products/creatine.svg', size: ['50 servings', 50, 'servings', '50SRV'], flavours: [['Demo Lemon Lime', 'DLL'], ['Demo Berry', 'DBERRY']], description: 'Temporary flavoured creatine sample for testing flavour selection.', benefits: 'Sample copy: measured servings; flavoured drink format; convenient mixing.', ingredients: 'Sample ingredients: creatine monohydrate, citric acid, natural-identical flavour and sweetener.', usage: 'Sample usage: mix one serving with 250 ml cold water.', warnings: 'DEMO ONLY. Formula and warnings are placeholders and must be replaced before real sale.' },
  { itemCode: 'PWO020', title: 'Demo Focus Pre-Workout', brand: 'Sample Performance Co.', category: 'Pre-Workouts', price: 12400, image: '/demo-products/pre-workout.svg', size: ['30 servings', 30, 'servings', '30SRV'], flavours: [['Demo Fruit Punch', 'DFRUIT'], ['Demo Blue Ice', 'DBLUE']], description: 'Temporary pre-workout sample created only for storefront interaction testing.', benefits: 'Sample copy: convenient pre-training drink format; flavour choices; measured servings.', ingredients: 'Sample ingredients: citrulline, beta-alanine, flavouring and caffeine. Quantities are intentionally omitted pending a verified label.', usage: 'Sample usage: assess tolerance with a partial serving mixed in water before training.', warnings: 'DEMO ONLY. Contains a sample caffeine reference. Not for children or caffeine-sensitive users. Replace with the verified label.' },
  { itemCode: 'PWO005', title: 'Demo Ignite Pre-Workout', brand: 'Prototype Athletics', category: 'Pre-Workouts', price: 13900, image: '/demo-products/pre-workout.svg', size: ['30 servings', 30, 'servings', '30SRV'], flavours: [['Demo Citrus', 'DCITRUS'], ['Demo Berry', 'DBERRY']], description: 'Temporary sample listing for pre-workout catalogue presentation.', benefits: 'Sample copy: pre-training drink format; two sample flavours; portable tub size.', ingredients: 'Sample ingredients: amino-acid blend, flavouring, sweetener and caffeine. Not a final formula.', usage: 'Sample usage: mix one serving with water 20–30 minutes before exercise.', warnings: 'DEMO ONLY. Do not use these placeholder directions for a real product. Replace with approved supplier copy.' },
  { itemCode: 'FTB003', title: 'Demo Metabolic Support Caps', brand: 'Sample Wellness Lab', category: 'Fat Burners', price: 8900, image: '/demo-products/fat-burner.svg', size: ['60 capsules', 60, 'capsules', '60CAP'], flavours: [['Demo Unflavoured', 'DUNFL']], description: 'Temporary capsule-product sample for category and cart testing; no efficacy claim is intended.', benefits: 'Sample copy: capsule format; simple daily-routine presentation.', ingredients: 'Sample ingredients: botanical blend and capsule shell. Exact formula must come from the verified label.', usage: 'Sample usage placeholder: follow the final manufacturer directions only.', warnings: 'DEMO ONLY. No weight-loss claim is made. Replace all content with compliant, verified product information.' },
  { itemCode: 'FTB004', title: 'Demo Active Routine Capsules', brand: 'Prototype Nutrition', category: 'Fat Burners', price: 9400, image: '/demo-products/fat-burner.svg', size: ['60 capsules', 60, 'capsules', '60CAP'], flavours: [['Demo Unflavoured', 'DUNFL']], description: 'Temporary sample record used to preview the Fat Burners category without making product claims.', benefits: 'Sample copy: compact capsule format; easy-to-read serving presentation.', ingredients: 'Sample ingredients: plant extracts and capsule shell. This is not a final ingredient panel.', usage: 'Sample usage placeholder: use only according to the final approved packaging.', warnings: 'DEMO ONLY. Contains placeholder copy. Confirm legal, safety and supplier requirements before sale.' },
  { itemCode: 'RCV005', title: 'Demo Recovery Amino Mix', brand: 'Sample Recovery Co.', category: 'Recovery', price: 11400, image: '/demo-products/recovery.svg', size: ['30 servings', 30, 'servings', '30SRV'], flavours: [['Demo Lemon Lime', 'DLL'], ['Demo Berry', 'DBERRY']], description: 'Temporary recovery-drink sample for variant, product-page and cart testing.', benefits: 'Sample copy: flavoured hydration format; measured servings; designed for catalogue demonstration.', ingredients: 'Sample ingredients: amino-acid blend, electrolytes, flavouring and sweetener. Not a final label.', usage: 'Sample usage: mix one serving with cold water during or after training.', warnings: 'DEMO ONLY. Replace formula, allergens, claims and directions with verified supplier content.' },
  { itemCode: 'PRT035', title: 'Demo Recovery Protein Bar', brand: 'Prototype Snacks', category: 'Recovery', price: 750, image: '/demo-products/recovery.svg', size: ['60 g bar', 60, 'g', '60G'], flavours: [['Demo Cocoa', 'DCOCOA'], ['Demo Berry', 'DBERRY']], description: 'Temporary snack sample used to demonstrate a second Recovery product.', benefits: 'Sample copy: individually portioned format; convenient post-training snack presentation.', ingredients: 'Sample ingredients: protein blend, oats, cocoa or berry flavour and sweetener. Allergen statement pending.', usage: 'Sample usage: ready-to-eat demonstration product.', warnings: 'DEMO ONLY. Replace nutrition, allergen, storage and best-before information before sale.' },
  { itemCode: 'ACC006', title: 'Demo Modular Shaker', brand: 'Sample Gear Co.', category: 'Accessories', price: 2900, image: '/demo-products/accessories.svg', size: ['700 ml', 700, 'ml', '700ML'], flavours: [['Demo Black', 'DBLACK'], ['Demo Clear', 'DCLEAR']], description: 'Temporary shaker listing with sample colour options for storefront testing.', benefits: 'Sample copy: mixing insert; storage section; portable screw-top format.', ingredients: 'Sample material: food-contact plastic. Verify final material and care specifications.', usage: 'Sample usage: wash before first use; secure the lid before shaking.', warnings: 'DEMO ONLY. Replace material, temperature and dishwasher guidance with verified product instructions.' },
  { itemCode: 'ACC003', title: 'Demo Everyday Shaker Cup', brand: 'Prototype Gear', category: 'Accessories', price: 2200, image: '/demo-products/accessories.svg', size: ['600 ml', 600, 'ml', '600ML'], flavours: [['Demo Smoke', 'DSMOKE'], ['Demo Clear', 'DCLEAR']], description: 'Temporary basic shaker sample for the Accessories catalogue.', benefits: 'Sample copy: compact size; simple mixing insert; leak-resistant demonstration design.', ingredients: 'Sample material: food-contact plastic. Final specification pending supplier confirmation.', usage: 'Sample usage: hand-wash before first use and check the lid is fully closed.', warnings: 'DEMO ONLY. Replace care and safety details with the verified manufacturer instructions.' },
];

function statementsFor(product, flavourIds) {
  const updated = new Date().toISOString();
  const [label, value, unit, code] = product.size;
  const rows = [
    { sql: `INSERT INTO website_products (item_code,title,brand,category,description,status,updated_at) VALUES (?,?,?,?,?,'active',?) ON CONFLICT(item_code) DO UPDATE SET title=excluded.title,brand=excluded.brand,category=excluded.category,description=excluded.description,status='active',updated_at=excluded.updated_at`, args: [product.itemCode, product.title, product.brand, product.category, `${DEMO_MARKER} ${product.description}`, updated] },
    { sql: `INSERT INTO product_merchandising (item_code,image_url,benefits,ingredients,usage,warnings,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(item_code) DO UPDATE SET image_url=excluded.image_url,benefits=excluded.benefits,ingredients=excluded.ingredients,usage=excluded.usage,warnings=excluded.warnings,updated_at=excluded.updated_at`, args: [product.itemCode, product.image, product.benefits, product.ingredients, product.usage, product.warnings, updated] },
    { sql: `INSERT INTO product_sizes (item_code,label,value,unit,code,active,sort_order,updated_at) VALUES (?,?,?,?,?,1,0,?) ON CONFLICT(item_code,code) DO UPDATE SET label=excluded.label,value=excluded.value,unit=excluded.unit,active=1,sort_order=0,updated_at=excluded.updated_at`, args: [product.itemCode, label, value, unit, code, updated] },
  ];
  product.flavours.forEach(([name], index) => rows.push({
    sql: `INSERT INTO product_variants (item_code,flavour_id,location,qty,price,visible_on_web,active,sort_order,updated_at) VALUES (?,?,?,?,?,1,1,?,?) ON CONFLICT(item_code,flavour_id,location) DO UPDATE SET qty=excluded.qty,price=excluded.price,visible_on_web=1,active=1,sort_order=excluded.sort_order,updated_at=excluded.updated_at`,
    args: [product.itemCode, flavourIds.get(name), 'HCM', 1, product.price, index, updated],
  }));
  return rows;
}

async function validatePos() {
  const pool = await getPool();
  const request = pool.request();
  products.forEach((product, index) => request.input(`code${index}`, sql.VarChar(40), product.itemCode));
  const result = await request.query(`SELECT RTRIM(itcode) itemCode, ISNULL(HCM,0) HCM FROM dbo.Stock WHERE RTRIM(itcode) IN (${products.map((_, index) => `@code${index}`).join(',')})`);
  const found = new Map(result.recordset.map((row) => [row.itemCode, Number(row.HCM)]));
  for (const product of products) {
    if (!found.has(product.itemCode)) throw new Error(`POS item ${product.itemCode} is missing`);
    if (found.get(product.itemCode) < product.flavours.length) throw new Error(`POS item ${product.itemCode} has insufficient HCM stock for demo variants`);
  }
}

async function remove() {
  const demo = await all(`SELECT item_code FROM website_products WHERE description LIKE ?`, `${DEMO_MARKER}%`);
  const codes = demo.map((row) => row.item_code);
  if (!codes.length) return console.log('No demo catalogue records found.');
  const placeholders = codes.map(() => '?').join(',');
  await batch([
    { sql: `DELETE FROM product_variants WHERE item_code IN (${placeholders})`, args: codes },
    { sql: `DELETE FROM product_sizes WHERE item_code IN (${placeholders})`, args: codes },
    { sql: `DELETE FROM product_merchandising WHERE item_code IN (${placeholders})`, args: codes },
    { sql: `DELETE FROM website_products WHERE item_code IN (${placeholders})`, args: codes },
    { sql: `DELETE FROM flavours WHERE code LIKE 'D%' AND id NOT IN (SELECT flavour_id FROM product_variants)` },
  ]);
  console.log(`Removed ${codes.length} demo products and their website-owned variants.`);
}

const applying = process.argv.includes('--apply');
const removing = process.argv.includes('--remove');
if (!applying && !removing) {
  console.log(`Dry run: ${products.length} demo products; pass --apply to write or --remove to clean up.`);
  console.table(products.map(({ itemCode, title, category, price }) => ({ itemCode, title, category, price })));
  process.exit(0);
}

({ getPool, sql } = await import('../api/_src/db.js'));
({ all, batch } = await import('../api/_src/store.js'));
if (removing) {
  await remove();
  process.exit(0);
}

if (process.env.ENABLE_EXPLORER === 'true') throw new Error('Refusing to seed while ENABLE_EXPLORER is enabled.');
await validatePos();
const existing = await all(`SELECT item_code,title FROM website_products WHERE status='active' AND description NOT LIKE ?`, `${DEMO_MARKER}%`);
if (existing.length) throw new Error(`Refusing to replace ${existing.length} non-demo active catalogue product(s). Archive them in /admin first.`);

const uniqueFlavours = new Map(products.flatMap((product) => product.flavours).map(([name, code]) => [name, code]));
await batch([...uniqueFlavours].map(([name, code], sortOrder) => ({
  sql: `INSERT INTO flavours (name,code,sort_order,active) VALUES (?,?,?,1) ON CONFLICT(name) DO UPDATE SET active=1,sort_order=excluded.sort_order`, args: [name, code, 100 + sortOrder],
})));
const flavourRows = await all(`SELECT id,name FROM flavours WHERE name IN (${[...uniqueFlavours].map(() => '?').join(',')})`, ...uniqueFlavours.keys());
const flavourIds = new Map(flavourRows.map((row) => [row.name, row.id]));
await batch(products.flatMap((product) => statementsFor(product, flavourIds)));
const seeded = await all(`SELECT item_code,category,title FROM website_products WHERE status='active' AND description LIKE ? ORDER BY category,title`, `${DEMO_MARKER}%`);
if (seeded.length !== 12) throw new Error(`Expected 12 demo products after seed; found ${seeded.length}`);
console.log(`Seeded ${seeded.length} editable demo products through the website catalogue tables.`);
console.table(seeded);
process.exit(0);
