# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Indian shoppers who tap a seller's link on Instagram or WhatsApp, mostly on a phone, often on a slow connection.
They want to see the product, trust the shop, and order quickly, paying cash on delivery or by UPI.

## Product Purpose
The public shop for every StoreKit merchant: one Next.js app serves `<slug>.storekit.site` (and custom domains),
chosen by hostname. Success is a shopper going from a social link to a placed order without friction or doubt.

## Positioning
A small seller's own branded website, run entirely from the StoreKit mobile app, so the shop feels as trustworthy as
a big marketplace while staying the seller's brand, not StoreKit's.

## Operating Context
- Owners set the store's look in the app: primary, secondary, button and background colours, font (system, Inter,
  Poppins, DM Sans), corner radius (none to large), product grid or list, logo, banners, announcement, home sections
  (featured, new arrivals, sale, best sellers) and which coupons are advertised.
- Shoppers browse home, categories, search, product pages, cart, checkout, order status and tracking, and policies.
- Payments are cash on delivery and manual UPI; there are no shopper accounts.

## Capabilities and Constraints
- Serves every category of small shop: clothing, handloom, jewellery, cosmetics, electronics, food, home goods.
- The owner's theme stays in charge. Any design must look right with arbitrary owner colours, all four fonts, every
  radius, and with or without logo, banners, photos and offers.
- Prices and totals come from the API; the browser only calls the storefront's own `/api` routes (CSP
  `connect-src 'self'`).
- Many products may have no photo.

## Brand Commitments
The store's own name, logo and theme lead. StoreKit appears only as a quiet "powered by" credit.

## Evidence on Hand
Only real store data from the API: products, prices, MRP, stock, categories, banners, advertised coupons, policies,
delivery methods. No reviews, ratings, sales counts or testimonials exist; never fabricate them.

## Product Principles
1. Mobile and social-first: the first phone screen must show what the shop sells.
2. Trust is earned with real facts (COD, delivery, returns policy, contact), never invented proof.
3. The seller's brand, not ours.
4. Fast on cheap phones: light pages, no heavy scripts.
5. Every owner theme and every empty state must still look finished.

## Accessibility & Inclusion
Text must stay readable on any owner colour (contrast is computed in `lib/theme.js`). Respect reduced motion.
