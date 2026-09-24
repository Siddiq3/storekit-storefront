import { themeSchema } from '@storekit/validation';

/**
 * The store's theme, from the API, into CSS. This is the theme the owner chose in the app (the existing
 * `themeSchema`: colours, font, layout, corner radius) — there is no second theme system here. Unknown or invalid
 * values fall back to the schema's defaults, so a bad record can never produce broken CSS.
 */

export const RADIUS = { none: '0px', small: '6px', medium: '12px', large: '22px' };

export const FONT_STACKS = {
  system: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  inter: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif',
  poppins: 'var(--font-poppins), ui-sans-serif, system-ui, sans-serif',
  'dm-sans': 'var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif',
};

export const parseTheme = (raw) => {
  const parsed = themeSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : themeSchema.parse({});
};

const channel = (hex, offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255;
const linear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** WCAG relative luminance of `#rrggbb`. */
export const luminance = (hex) => {
  const h = hex.length === 4 ? `#${[...hex.slice(1)].map((c) => c + c).join('')}` : hex;
  return 0.2126 * linear(channel(h, 1)) + 0.7152 * linear(channel(h, 3)) + 0.0722 * linear(channel(h, 5));
};

/** Black or white, whichever reads better on `hex`. */
export const readableOn = (hex) => (luminance(hex) > 0.4 ? '#111827' : '#FFFFFF');

/** CSS custom properties for a store, to be set on the page's root element. */
export const themeVars = (rawTheme) => {
  const t = parseTheme(rawTheme);
  const text = readableOn(t.backgroundColor);
  const dark = text === '#FFFFFF';
  return {
    '--sk-primary': t.primaryColor,
    '--sk-primary-text': readableOn(t.primaryColor),
    '--sk-secondary': t.secondaryColor,
    '--sk-button': t.buttonColor,
    '--sk-button-text': t.buttonTextColor,
    '--sk-bg': t.backgroundColor,
    '--sk-text': text,
    '--sk-muted': dark ? 'rgba(255,255,255,0.68)' : 'rgba(17,24,39,0.62)',
    '--sk-line': dark ? 'rgba(255,255,255,0.16)' : 'rgba(17,24,39,0.12)',
    '--sk-surface': dark ? 'rgba(255,255,255,0.06)' : 'rgba(17,24,39,0.03)',
    '--sk-radius': RADIUS[t.cornerRadius],
    '--sk-font': FONT_STACKS[t.fontFamily],
  };
};
