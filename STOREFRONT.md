# Fitness Factory customer storefront

The customer website lives in `storefront/`, isolated from the authenticated admin app in `web/`.

## Architecture

- `storefront/`: React 18 + Vite customer application. It contains no admin components, sessions, database credentials or POS access.
- `GET /api/storefront/products`: public read-only catalogue projection. It returns active website products with public prices, size/flavour choices and a boolean availability flag. It does not expose costs, per-location stock, exact quantities or internal product states.
- `web/`: existing authenticated admin portal for catalogue and website-stock management.
- VinSim remains read-only. Storefront catalogue enrichment stays in the app database.

## Local development

```powershell
npm install --prefix storefront
npm run dev --prefix api
npm run dev --prefix storefront
```

The storefront runs at `http://localhost:5174` and proxies `/api` to port 4000.

## Current milestone

Implemented: responsive design system, dark-default/light theme, accessible shared header/navigation/footer, homepage, All Products, all six category routes, public catalogue reads, initial search/sort, provisional support/legal pages, the reusable product-detail template, and a production-quality persistent cart. Cart lines use stable product/size/flavour identifiers rather than cached product objects, merge duplicate selections, cap quantities at 10, revalidate price/availability against the live public catalogue, exclude unavailable lines from totals and block checkout until the customer resolves them.

Current preview: checkout and safe server-side order creation, customer account/orders, 12 editable demo catalogue records, approved campaign media and 12 optimized transparent packshots are implemented. Final policy content, payment-provider hand-off and verified supplier label copy are still required before real sales.

## Product content and temporary imagery

Product title, brand, category, description, sizes, image URL, benefits, ingredients, usage and warnings are maintained in the authenticated Website Catalogue admin page. Only active products reach the public read-only API. Exact quantities, stock locations, costs, credentials and admin session data never reach the storefront.

The product detail template deliberately shows a labelled temporary placeholder when no image has been entered. Admin image URLs must be HTTPS or a local `/` path. The preview catalogue uses stable `/product-packshots/<ITEM_CODE>.webp` paths from `storefront/public/product-packshots/`; `provenance.csv` and its README document the manufacturer sources and replacement process. Product cards and detail pages use contain-style rendering and consistent padding so transparent cutouts keep their proportions. Catalogue images below the first row are lazy-loaded.

The demo seed keeps the `[DEMO-CATALOG-2026]` marker in each description, refuses to overwrite non-demo active catalogue records, and can be reversed with `npm run catalogue:demo:remove`. It writes only to the app-owned website catalogue, merchandising, size and variant tables; VinSim/POS is validated read-only and is never written.

## Safety and launch

- Never put API keys or database credentials in `storefront/` or any `VITE_*` variable.
- Checkout and account endpoints must validate every field server-side and use HttpOnly sessions.
- Delivery and returns copy is intentionally labelled provisional until the owner confirms policy.
- Storefront deployment, production changes, payment-provider setup and domain changes require explicit owner approval.
# Checkout and orders

The storefront creates orders through `POST /api/storefront/checkout`. The API revalidates published products, options, prices and available website stock; the browser's totals are never trusted. Customer sessions use an HttpOnly cookie and `/account` shows only that customer's order history.

Orders start as `pending_payment`. Visa/Mastercard and Koko are integration boundaries only: this application does not render card fields, receive PAN/CVV data or claim payment success. Merchant credentials, signed provider callbacks, delivery pricing and final policy/legal copy must be approved and configured before launch. Until then the confirmation explicitly says payment is pending.

`CHECKOUT_ENABLED` is fail-closed: checkout returns `503` unless its value is exactly `true`. Enable it only after the approved payment hand-off and signed callback are implemented and tested. Checkout is additionally limited to eight attempts per IP per 15 minutes.

The protected `/admin` order workspace lists reservations and allows operational state changes. `/api` remains the backend namespace. `ENABLE_EXPLORER` must remain unset/false in production.

## Pre-launch placeholders

- Delivery time, charges and service areas
- Returns eligibility and time limits
- Privacy retention/contact details
- Terms, merchant identity and dispute language
- Approved payment provider credentials and webhook verification
