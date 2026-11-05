const SITE_URL = 'https://fitness-factory-dashboard.vercel.app';
const DEFAULT_DESCRIPTION = 'Authentic sports nutrition and performance essentials delivered across Sri Lanka.';

const routeCopy = {
  '/': ['Fitness Factory | Sports Nutrition Sri Lanka', DEFAULT_DESCRIPTION],
  '/products': ['All Products | Fitness Factory', 'Shop protein, creatine, pre-workouts, recovery products, fat burners and accessories in Sri Lanka.'],
  '/search': ['Search Products | Fitness Factory', 'Search the Fitness Factory sports nutrition catalogue.'],
  '/cart': ['Your Bag | Fitness Factory', 'Review your selected Fitness Factory products before checkout.'],
  '/checkout': ['Checkout | Fitness Factory', 'Enter delivery details and review your Fitness Factory order.'],
  '/account': ['Your Account | Fitness Factory', 'View your Fitness Factory orders and account details.'],
  '/contact': ['Contact | Fitness Factory', 'Contact Fitness Factory for product and order support in Sri Lanka.'],
  '/faq': ['Frequently Asked Questions | Fitness Factory', 'Answers about Fitness Factory products, payments, delivery and returns.'],
  '/delivery': ['Delivery | Fitness Factory', 'Fitness Factory delivery information for customers in Sri Lanka.'],
  '/returns': ['Returns | Fitness Factory', 'Fitness Factory returns information and eligibility guidance.'],
  '/privacy': ['Privacy | Fitness Factory', 'How Fitness Factory handles customer and website data.'],
  '/terms': ['Terms | Fitness Factory', 'Terms for shopping with Fitness Factory.'],
};

const upsertMeta = (name, content, attribute = 'name') => {
  let node = document.head.querySelector(`meta[${attribute}="${name}"]`);
  if (!node) { node = document.createElement('meta'); node.setAttribute(attribute, name); document.head.appendChild(node); }
  node.content = content;
};

export function updateSeo(path, product, category) {
  let [title, description] = routeCopy[path] || ['Page not found | Fitness Factory', DEFAULT_DESCRIPTION];
  let schema = { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Fitness Factory', url: SITE_URL };
  if (category) {
    title = `${category} | Fitness Factory`;
    description = `Shop Fitness Factory's ${category.toLowerCase()} selection in Sri Lanka.`;
  }
  if (product) {
    title = `${product.title} | Fitness Factory`;
    description = String(product.description || `${product.title} by ${product.brand}.`).slice(0, 160);
    schema = {
      '@context': 'https://schema.org', '@type': 'Product', name: product.title, description,
      sku: product.itemCode, brand: { '@type': 'Brand', name: product.brand },
      image: product.imageUrl ? new URL(product.imageUrl, SITE_URL).href : undefined,
      offers: { '@type': 'Offer', priceCurrency: 'LKR', price: product.price, availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: `${SITE_URL}${path}` },
    };
  }
  document.title = title;
  upsertMeta('description', description);
  upsertMeta('og:title', title, 'property');
  upsertMeta('og:description', description, 'property');
  upsertMeta('og:url', `${SITE_URL}${path}`, 'property');
  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
  canonical.href = `${SITE_URL}${path}`;
  let jsonLd = document.head.querySelector('#route-structured-data');
  if (!jsonLd) { jsonLd = document.createElement('script'); jsonLd.id = 'route-structured-data'; jsonLd.type = 'application/ld+json'; document.head.appendChild(jsonLd); }
  jsonLd.textContent = JSON.stringify(schema);
}
