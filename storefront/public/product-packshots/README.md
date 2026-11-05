# Storefront product packshots

These 12 transparent WebP cutouts are the approved preview catalogue images. Stable filenames match the VinSim item codes, while the storefront and admin catalogue both read the URL from `product_merchandising.image_url`.

- Source delivery: `D:\MausBot\AgencyIntern\website_assets\product_packshots\storefront\`
- Source masters: `D:\MausBot\AgencyIntern\website_assets\product_packshots\masters\` (not copied into the website bundle)
- Repository provenance: `provenance.csv`
- Replacement: upload an approved optimized asset under a stable site path, then change the product image URL in `/admin`; do not change VinSim/POS.
- Removal: run `npm run catalogue:demo:remove` to remove only records carrying the demo marker. Remove this directory only after all catalogue image URLs have been replaced.

The source delivery remains unchanged outside this repository.
