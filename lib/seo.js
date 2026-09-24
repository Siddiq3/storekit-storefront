import { absoluteUrl, productPath, categoryPath } from './urls.js';

/**
 * Metadata and structured data. Every absolute address here is built from the canonical host the API returned for the
 * store, so `https://myshop.storekit.site/products/brake-pad--…` canonicalises to exactly that, and a store reached on
 * another name (a custom domain, later) points search engines at its canonical address.
 */

export const truncate = (value, max = 160) => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
};

const images = (list) => list.filter(Boolean).map((url) => ({ url }));

const base = ({ store, canonicalHost, path, title, description, image, siteName }) => {
  const url = absoluteUrl(canonicalHost, path);
  return {
    metadataBase: new URL(absoluteUrl(canonicalHost, '/')),
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      siteName: siteName ?? store.name,
      title,
      description,
      ...(image ? { images: images([image]) } : {}),
    },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description, ...(image ? { images: [image] } : {}) },
    ...(store.faviconUrl ? { icons: { icon: store.faviconUrl } } : {}),
  };
};

export const storeMetadata = ({ store, canonicalHost }) => {
  const title = store.name;
  const description = truncate(store.description) || `Shop ${store.name} online.`;
  return base({ store, canonicalHost, path: '/', title, description, image: store.logoUrl ?? store.banners[0]?.imageUrl });
};

/** Metadata for any other public page: its own title, description, canonical and Open Graph address. */
export const pageMetadata = ({ store, canonicalHost, path, title, description }) =>
  base({ store, canonicalHost, path, title, description, image: store.logoUrl });

export const productMetadata = ({ store, canonicalHost, product }) => {
  const path = productPath(product);
  const description = truncate(product.summary || product.description) || `Buy ${product.name} from ${store.name}.`;
  const image = product.images?.[0]?.url ?? product.imageUrl;
  const metadata = base({ store, canonicalHost, path, title: `${product.name} — ${store.name}`, description, image });
  return {
    ...metadata,
    // Open Graph has no "product" type in Next's metadata model; these are the tags shops and crawlers read.
    other: {
      'product:price:amount': (Number(product.price) / 100).toFixed(2),
      'product:price:currency': 'INR',
      'product:availability': product.inStock ? 'in stock' : 'out of stock',
    },
  };
};

export const categoryMetadata = ({ store, canonicalHost, category }) =>
  base({
    store, canonicalHost, path: categoryPath(category),
    title: `${category.name} — ${store.name}`,
    description: `Browse ${category.name} at ${store.name}.`,
    image: category.imageUrl ?? store.logoUrl,
  });

/** Pages that must not be indexed: cart, checkout, order pages, search results. */
export const noindex = (title) => ({ title, robots: { index: false, follow: false } });

/* ───────────── JSON-LD ───────────── */

/** JSON safe to place inside a <script>: `<` can never close the tag. */
export const safeJsonLd = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

export const organizationLd = ({ store, canonicalHost }) => ({
  '@context': 'https://schema.org',
  '@type': 'Store',
  name: store.name,
  url: absoluteUrl(canonicalHost, '/'),
  ...(store.description ? { description: truncate(store.description, 300) } : {}),
  ...(store.logoUrl ? { logo: store.logoUrl, image: store.logoUrl } : {}),
  ...(store.contact?.phone ? { telephone: store.contact.phone } : {}),
});

export const productLd = ({ store, canonicalHost, product }) => ({
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: product.name,
  url: absoluteUrl(canonicalHost, productPath(product)),
  ...(product.description || product.summary ? { description: truncate(product.description || product.summary, 500) } : {}),
  ...(product.sku ? { sku: product.sku } : {}),
  ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
  image: (product.images?.length ? product.images.map((i) => i.url) : [product.imageUrl]).filter(Boolean),
  offers: {
    '@type': 'Offer',
    priceCurrency: 'INR',
    price: (Number(product.price) / 100).toFixed(2),
    availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    url: absoluteUrl(canonicalHost, productPath(product)),
    seller: { '@type': 'Organization', name: store.name },
  },
});

export const breadcrumbLd = ({ canonicalHost, trail }) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: trail.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: absoluteUrl(canonicalHost, item.path),
  })),
});
