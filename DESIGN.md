---
name: StoreKit Storefront
description: The Indian marketplace standard, in each shop's own colours.
colors:
  shop-primary: "var(--sk-primary)"
  shop-primary-text: "var(--sk-primary-text)"
  shop-button: "var(--sk-button)"
  shop-background: "var(--sk-bg)"
  shop-text: "var(--sk-text)"
  muted-text: "var(--sk-muted)"
  hairline: "var(--sk-line)"
  shop-tint: "var(--sk-tint)"
  accent-soft: "var(--sk-accent-soft)"
  accent-ink: "var(--sk-accent-ink)"
  saving-green: "#0a7d3e"
  danger: "#b42318"
  ok: "#15803d"
  warn: "#b45309"
typography:
  display:
    fontFamily: "Urbanist, var(--sk-font)"
    fontSize: "clamp(2rem, 7vw, 3.75rem)"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Urbanist, var(--sk-font)"
    fontSize: "clamp(1.3125rem, 4vw, 1.75rem)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "var(--sk-font)"
    fontSize: "0.875rem"
    fontWeight: 700
    letterSpacing: "0.05em"
  body:
    fontFamily: "var(--sk-font)"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "var(--sk-font)"
    fontSize: "0.6875rem"
    fontWeight: 700
    letterSpacing: "0.06em"
rounded:
  control: "min(var(--sk-radius), 10px)"
  card: "min(var(--sk-radius), 14px)"
  pill: "999px"
spacing:
  gutter-phone: "16px"
  gutter-tablet: "24px"
  gutter-desktop: "32px"
  section-phone: "36px"
  section-desktop: "56px"
components:
  button-primary:
    backgroundColor: "{colors.shop-button}"
    textColor: "var(--sk-button-text)"
    rounded: "{rounded.control}"
    padding: "12px 20px"
    height: "46px"
  button-quiet:
    backgroundColor: "{colors.shop-background}"
    textColor: "{colors.shop-text}"
    rounded: "{rounded.control}"
  card-add:
    backgroundColor: "{colors.shop-background}"
    textColor: "{colors.shop-text}"
    rounded: "{rounded.control}"
    height: "40px"
  card-add-hover:
    backgroundColor: "{colors.shop-tint}"
    textColor: "{colors.accent-ink}"
  badge:
    backgroundColor: "{colors.shop-primary}"
    textColor: "{colors.shop-primary-text}"
    typography: "{typography.label}"
  offer-stub:
    backgroundColor: "{colors.shop-primary}"
    textColor: "{colors.shop-primary-text}"
  input:
    backgroundColor: "{colors.shop-background}"
    textColor: "{colors.shop-text}"
    rounded: "{rounded.control}"
    height: "46px"
---

# Design System: StoreKit Storefront

## Overview

**Creative North Star: "The Marketplace Standard, in the Shop's Own Colours"**

One Next.js app serves every merchant, so the system is a structure, not a palette: Myntra, Nykaa and Flipkart conventions (banner rail, facts strip, coupon tickets, price-led product cards, a buy bar pinned to the phone's foot, a Myntra-style price breakdown) rendered in whatever colours, font, corner radius and grid or list layout the owner chose in the app. Every colour token is a CSS variable set per store by `lib/theme.js`; the hex values here are only the fallbacks before a store loads.

Density is retail, not dashboard: products without boxes, photos leading, generous space between sections and tight groups inside them. Phones come first, because shoppers arrive from Instagram and WhatsApp links. Motion is short (150-250ms), says something happened, and switches off for reduced motion.

**Key Characteristics:**
- The owner's primary colour carries every action, the announcement, badges, coupon stubs and the no-banner hero band.
- Savings are always green, whatever the shop's colour.
- No-photo products show their name set on a tint, never a grey box.
- Phone pages pin the one action (Add to cart, Checkout, Place order) to the foot of the screen with the price beside it.

## Colors

One owner accent over the owner's background, with tints mixed from them; green is the only fixed hue that carries meaning.

### Primary
- **Shop Primary** (`--sk-primary`): announcement bar, hero band, coupon stubs, badges, active nav underline, selected options, carousel dot, focus ring.
- **Shop Button** (`--sk-button`): the main action on each page.

### Neutral
- **Shop Background** (`--sk-bg`): the page; `--sk-page` follows it.
- **Shop Text / Muted Text** (`--sk-text`, `--sk-muted`): chosen by `readableOn` for contrast against the background.
- **Hairline** (`--sk-line`): dividers between sections, lines and list rows.
- **Shop Tint** (`--sk-tint`, primary at 6%): no-photo slots, category tiles, footer, sale band, icon discs.
- **Accent Ink** (`--sk-accent-ink`): text in the accent on light grounds ("View all", option hover, codes).

### Named Rules
**The Green Saving Rule.** Discounts, "You save", free delivery and applied coupons are always saving green (#0a7d3e); the shop's colour never signals a saving.
**The Owner Colour Rule.** Never hard-code a brand colour in a component. Use `--sk-*` variables or `color-mix` from them, so every theme stays right.

## Typography

**Display Font:** Urbanist (headlines only, all themes)
**Body Font:** the owner's choice: system, Inter, Poppins or DM Sans (`--sk-font`)

**Character:** a soft geometric display for the store name and section heads, over whichever workhorse sans the owner picked.

### Hierarchy
- **Display** (600, clamp(2rem, 7vw, 3.75rem), 1.04): the store name in the hero band.
- **Headline** (600, clamp(1.3125rem, 4vw, 1.75rem), 1.2): section heads, page titles, product name.
- **Title** (700, 0.875rem, uppercase, 0.05em): product-page section labels (Available offers, Delivery & services, Product details) and "Price details".
- **Body** (400, 0.9375rem, 1.5): descriptions capped at 70ch.
- **Label** (700, 0.6875rem, uppercase, 0.06em): badges, sold-out bands.

### Named Rules
**The Tabular Price Rule.** Every price, total and count uses tabular numerals.

## Layout

The container is 1280px max with 16 / 24 / 32px gutters at phone / 640px / 900px. Product grids run 2 → 3 → 4 → 5 columns at phone / 640 / 900 / 1200; home sections and similar products are sideways rails on phones (44% cards) and capped grids above. The phone home page runs banners, the product gallery and the sale band edge to edge. At 900px+ the product buying column and the cart and checkout summaries are sticky at 140px. On phones the buy bar and pay bar are fixed to the foot, and the main area reserves 104px for them.

## Elevation & Depth

Flat by default: depth comes from tint and hairlines. Shadows appear only where something floats.

### Shadow Vocabulary
- **Raised** (`0 12px 32px -14px` of text at 30%): menu panel, carousel arrows.
- **Bar** (`0 -8px 24px -12px` of text at 28%): the phone buy and pay bars.
- **Header lift** (`0 6px 18px -12px`): the sticky header once the page scrolls.

## Shapes

Corners follow the owner's radius but are capped: controls at 10px, cards at 14px, so a "large" theme never turns cards into pills. Size and option chips, count badges and icon discs are full pills. Coupon tickets have notches cut in the page colour and a dashed tear line.

## Components

### Buttons
- **Primary:** owner button colour, 46px tall (50-52px in the buy bar), a slight darken and soft coloured shadow on hover, scale 0.98 on press.
- **Quiet:** background colour with a 20% text-mix border.
- **Hero CTA:** inverted on the band (primary-text ground, primary text).
- **After adding:** the buy button becomes an outlined "Go to cart" link.

### Product card
Photo at 3:4 with Sale / New! badges only; then brand (when set), a two-line name, and a price row: bold price, struck MRP, green "% OFF". Below that sits an outlined Add to cart with a bag icon, which fills with the primary colour for 1.6s once added. When sold out, the photo is greyed and carries an OUT OF STOCK band.

### Coupon ticket
A primary stub with the value ("10% OFF", "Storewide"), a dashed tear and notches, and a body with the description, terms and a dashed code button that copies. On phones it shows only the code and a copy icon.

### Facts strip
Icon discs with a bold fact and a muted line, drawn only from settings (COD, free delivery rule, UPI, returns). Unavailable COD is struck through and muted.

### Inputs / Fields
46px tall, 18% text-mix stroke that darkens on hover. Focus turns the border primary and adds a 3px accent-soft ring. Errors use the danger border plus text below.

### Navigation
A sticky header: menu, logo and cart on phones with search beneath; logo, search and labelled Track order / Cart icons on desktop. A sideways category row underneath has a primary underline that scales in on hover and shows fully for the current page.

## Do's and Don'ts

### Do:
- **Do** test every component against a dark, a light and a saturated owner primary, and with no logo, banners, photos or offers.
- **Do** keep saving green for discounts and free delivery.
- **Do** show only facts the store's settings make true (COD, UPI, delivery, returns).
- **Do** pin the one action to the phone's foot on product, cart and checkout pages.

### Don't:
- **Don't** invent ratings, reviews, sales counts or "inclusive of taxes" claims; the API has none.
- **Don't** let an entrance animation keep a transform after it ends (`fill-mode: backwards` only); it traps fixed bars.
- **Don't** use glyphs (✓, ←, →) for icons; use `components/icons.jsx`.
- **Don't** put an eyebrow label above a heading.
