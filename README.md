# StoreKit storefront

The public, customer-facing shop for every StoreKit merchant. One Next.js application serves every store: the
hostname decides which one.

```
StoreKit Owner/Admin Web  →  billing, account, admin           (web)
StoreKit Mobile           →  merchant management               (mobile)
StoreKit Storefront       →  public customer shopping          (this repository)
StoreKit Backend          →  DynamoDB / R2                     (backend)
```

| | |
|---|---|
| Marketing / website | `https://storekit.site` (the `web` app; not served by this one) |
| **Merchant storefront** | `https://<business-slug>.storekit.site` |
| API | `https://api.storekit.site` (staging: `https://api-staging.storekit.site`) |
| Customer domains | later; the same code answers them (see "Hostname resolution") |

## The rules this app is built on

1. **The store comes from the hostname, and only from the API's answer about the hostname.** `middleware.js` sends the
   incoming `Host` to `GET /v1/public/hosts/resolve?host=…`. The backend is the authority; there is no host rule in this
   repository beyond checking that a Host header is shaped like one (using the backend's own `hostFromHeader`).
   A `businessId` is never accepted from a URL, cookie, query string, header or body.
2. **The browser never calls the StoreKit API.** All API calls are made by this app's server (middleware, server
   components, `/api/*` route handlers). The API's CORS list is exact origins and stays that way, and this app's CSP is
   `connect-src 'self'`, so a script on a store page could not reach the API even if it tried.
3. **The shopper's address is forwarded, with a shared secret, so the API rate-limits shoppers and not this server.**
   The secret is server-only and never reaches the browser bundle.
4. **Nothing one merchant sees is ever served to another.** Every cached response is keyed by the store's slug first;
   carts, quotes and orders are never cached.
5. **Prices and totals come from the API.** The cart holds ids and quantities. The order is created with the total the
   shopper saw, and the API refuses it if that total is stale.

## Local development

You need the backend running, and hostnames that resolve to your machine. `*.lvh.me` resolves to `127.0.0.1`, so no
`/etc/hosts` edits are needed (`*.localhost` does not resolve reliably).

```bash
# 1. the API (backend/api), with the storefront root set to lvh.me
#    in backend/api/.env:  STOREFRONT_BASE_URL=http://lvh.me:3000
cd ../backend/api && npm run dev            # http://localhost:8787

# 2. this app
cp .env.example .env.local                  # defaults already point at the above
npm install
npm run dev                                 # http://lvh.me:3000  and  http://<slug>.lvh.me:3000
```

Open `http://<your-store-slug>.lvh.me:3000`. A slug that is not a store shows the "store not found" page, and
`http://lvh.me:3000` itself is not a store.

Useful commands:

| | |
|---|---|
| `npm run lint` | ESLint |
| `npm test` | Vitest (host resolution, middleware, forwarding, security, store data, cart, checkout, SEO/theme, rendering) |
| `npm run build` | production build |
| `npm run verify:bundle` | after a build: proves the secret, its header and the API address are not in the browser files |
| `npm run sync:check` | compares `packages/shared` and `packages/validation` with `../backend/packages` |

`packages/shared` and `packages/validation` are copies of `backend/packages/*`, as in `web` and `mobile`. Re-copy them
when the backend's change, and run `npm run sync:check`.

## Environment variables

All server-side. **None may be prefixed `NEXT_PUBLIC_`.**

| Variable | Production | Staging | Local |
|---|---|---|---|
| `API_BASE_URL` | `https://api.storekit.site/v1` | `https://api-staging.storekit.site/v1` | `http://localhost:8787/v1` |
| `STOREFRONT_ROOT_URL` | `https://storekit.site` | the staging storefront root | `http://lvh.me:3000` |
| `EDGE_SHARED_SECRET` | the production secret (required) | the staging secret (required) | unset |
| `CLIENT_IP_HEADER` | `cf-connecting-ip` (default) | same | unset |

- `API_BASE_URL` includes `/v1`. (The mobile app's `EXPO_PUBLIC_API_URL` does not; the app adds it.)
- `STOREFRONT_ROOT_URL` must equal the API's `STOREFRONT_BASE_URL`. It supplies the scheme for canonical addresses and
  redirects, and the "Powered by StoreKit" link.
- In production the app refuses to serve (a 503 state page) if `API_BASE_URL` is not `https`, or `EDGE_SHARED_SECRET` is
  missing or shorter than 32 characters.

## Hostname resolution

```
asha.storekit.site   ─┐
demo.storekit.site    ├─►  middleware ─► GET /v1/public/hosts/resolve?host=<Host>
shop.example.com     ─┘                     │
                                            ├─ 200 { slug, canonicalHost, redirect }
                                            └─ 404 (unknown, inactive, suspended, not a store: all the same)
```

- `200`, `redirect: false`: the slug is set as a request header (any copy a client sent is deleted first) and the page renders.
- `200`, `redirect: true`: the host is not the store's canonical address; the visitor gets a 308 to `canonicalHost`, same path.
- `404`: a 404 "we could not find this store" page. Invalid host: 400. API unreachable or rate limited: 503 with `Retry-After`,
  and a page that says nothing about why.
- The answer is remembered in memory for 30 s (a "no" for 10 s), per hostname, bounded in size, and concurrent first
  visits share one call. An outage is never remembered.
- Custom domains use exactly this path: the API decides which hostnames belong to which store. Nothing here changes when
  they are switched on.

## The trusted edge secret

The storefront is one server calling the API for many shoppers. To keep per-shopper rate limits, it forwards:

```
CF-Connecting-IP:        <the shopper's address>
X-StoreKit-Edge-Secret:  <EDGE_SHARED_SECRET>
```

- The API believes the address **only** if the secret matches (constant-time) and the address is exactly one valid IPv4/IPv6
  address. A wrong, missing or malformed secret, or a bad address, is ignored: the API then uses its real connecting address.
  It never reads `X-Forwarded-For` or `X-Real-IP`. Rules and tests: the backend's `docs/DEPLOYMENT.md`, "Client IP and rate limiting".
- The secret is the same value as the API's `EDGE_SHARED_SECRET` (SSM `/storekit/<stage>/edge-shared-secret`). Generate one
  per environment with `openssl rand -base64 48`.
- It exists only in server environment variables. Client components cannot import the modules that read it, it is not in
  `next.config.mjs`, and `npm run verify:bundle` scans every browser file after a build (`EDGE_SHARED_SECRET=<sentinel> npm run build && npm run verify:bundle`).
- The shopper's address is read from **one** header, `CLIENT_IP_HEADER` (default `cf-connecting-ip`), and only if it is exactly
  one address. That is correct only if this app's origin is reachable solely through the edge that sets the header
  (Cloudflare): a request that goes around the edge could choose its own identity.
- Known limit: Cloudflare sets `CF-Connecting-IP` itself on requests that go through its proxy, so this contract works
  while the API hostname is not proxied (DNS-only). See the backend's deployment guide before proxying `api.storekit.site`.

## Routes

| | |
|---|---|
| `/` | store home: banners, name, description, the owner's sections, products, announcement |
| `/products`, `/category/[slug]` | listings, sortable, paged by cursor (`/c/[slug]` redirects to `/category/[slug]`) |
| `/search?q=` | search |
| `/products/[name]--[id]` | product: gallery, options, price, stock, add to cart, structured data |
| `/cart` | items, quantities, coupon, subtotal, delivery, total (all quoted by the API) |
| `/checkout` | delivery details and payment: **COD** or **UPI_MANUAL** (the only two methods the API has) |
| `/order/success?t=`, `/order/track?t=` | confirmation and tracking, by the order's tracking token |
| `/pages/[slug]` | the owner's own pages (shipping, refunds, privacy), shown as plain text |
| `/track` | find an order by order number and the mobile number on it |
| `/robots.txt`, `/sitemap.xml` | per host, on the store's canonical address |
| `/store-not-found`, `/invalid-host`, `/store-unavailable` | state pages, reachable only by rewrite |

Product addresses are `name--<id>` because the API needs the id (there is no lookup by name). The name part is
corrected with a permanent redirect if it is wrong. Pages that are private (`cart`, `checkout`, `order/*`, `api/*`) are
`no-store` and `noindex`; order pages also send no `Referer`.

## SEO

Server-rendered metadata, canonical URL, Open Graph and Twitter tags on every public page, `Store`, `Product` (with
price and availability) and `BreadcrumbList` structured data, a per-host sitemap and robots. **Every absolute address is
built from the `canonicalHost` the API returned for the store**, never from the Host the visitor typed and never from
`storekit.site`: `https://asha.storekit.site/products/brake-pad--…` canonicalises to itself. Missing products and
categories return real 404 statuses; redirects are real 308s.

## Layout

Modelled on a modern small-shop storefront: an announcement bar; a header with menu, brand, search, "Track order" and
cart (menu and search stack on a phone); a category row with the current page underlined; a centred hero and the owner's
banner; photo cards for categories; portrait product cards with discount / NEW / SALE badges and "OUT OF STOCK"; a strip of
what the shop offers; and a footer with categories, policy pages and contact. The strip and the footer only claim what the
checkout can do: cash on delivery and UPI, and free delivery only when the store's delivery rule says so.

## Theme and branding

The store's own theme from the API (colours, font, layout grid/list, corner radius), turned into CSS variables; invalid
values fall back to the theme schema's defaults. Text colour is chosen for contrast against the store's background.
Sections and banners are the owner's. There is no second theme system, and custom design (Pro) is not implemented.
"Powered by StoreKit" is shown when the API says branding applies (`poweredByBranding`, from the plan's `removeBranding`
entitlement); this app never looks at a plan id.

## Deployment model

- One deployment serves every store. Point the wildcard record `*.storekit.site` (proxied by Cloudflare) at it. The host must
  pass the original `Host` header through and run Next.js middleware. `storekit.site` and `www` stay on the website and
  `api` on the API; a more specific record always beats the wildcard.
- The origin should accept traffic only from Cloudflare (that is what makes `CF-Connecting-IP` trustworthy).
- Set the three environment variables above per environment; `NODE_ENV=production` is what turns on the strict checks.
- Public reads are kept in each instance's memory for 30–120 s (the API's own cache lifetimes), so instances need no shared cache.
- Custom domains later: the storefront's origin becomes Cloudflare for SaaS's fallback origin and `domains.storekit.site`
  the CNAME target. No storefront change is needed.
- Nothing is deployed yet. Do not enable wildcard DNS until the API's `EDGE_SHARED_SECRET` is set.

## What is not here

Customer accounts or login; card or online payment (the API has none for shoppers); owner-written pages; customer
cancellation; UPI screenshot upload; analytics events; a custom design for Pro (`Coming soon`); custom-domain setup (the
backend owns it).
