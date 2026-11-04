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

Next: checkout and safe server-side order creation, customer account/orders, final policy content, approved product imagery and end-to-end tests.

## Product content and temporary imagery

Product title, brand, category, description, sizes, image URL, benefits, ingredients, usage and warnings are maintained in the authenticated Website Catalogue admin page. Only active products reach the public read-only API. Exact quantities, stock locations, costs, credentials and admin session data never reach the storefront.

The product detail template deliberately shows a labelled temporary placeholder when no image has been entered. Admin image URLs must be HTTPS or a local `/` path. Replace every placeholder or temporary third-party image through the admin portal with approved product photography before launch; no temporary image is treated as a final brand asset.

## Safety and launch

- Never put API keys or database credentials in `storefront/` or any `VITE_*` variable.
- Checkout and account endpoints must validate every field server-side and use HttpOnly sessions.
- Delivery and returns copy is intentionally labelled provisional until the owner confirms policy.
- Storefront deployment, production changes, payment-provider setup and domain changes require explicit owner approval.
