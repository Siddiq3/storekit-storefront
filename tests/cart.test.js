import { describe, expect, it } from 'vitest';
import { addLine, itemCount, lineKey, MAX_LINES, removeLine, sanitize, setQuantity, toQuoteLines } from '@/lib/cart.js';
import { clampQuantity, money } from '@/lib/money.js';

const A = '01H8XGJWBWBAQ4Z4RZ4ZQ1ZQ1Z';
const B = '01H8XGJWBWBAQ4Z4RZ4ZQ1ZQ2Z';
const V = '01H8XGJWBWBAQ4Z4RZ4ZQ1ZQ3Z';
const line = (over = {}) => ({ productId: A, quantity: 1, name: 'Kurti', unitPrice: 129900, ...over });

describe('cart', () => {
  it('adds a line', () => {
    const lines = addLine([], line());
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ productId: A, variantId: null, quantity: 1 });
  });

  it('adding the same product and variant again raises the quantity instead of duplicating', () => {
    let lines = addLine([], line({ quantity: 2 }));
    lines = addLine(lines, line({ quantity: 3 }));
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(5);
  });

  it('a different variant of the same product is a different line', () => {
    const lines = addLine(addLine([], line()), line({ variantId: V }));
    expect(lines).toHaveLength(2);
    expect(lines.map(lineKey)).toEqual([`${A}:`, `${A}:${V}`]);
  });

  it('updates a quantity, within 1–99', () => {
    const lines = addLine([], line());
    expect(setQuantity(lines, lineKey(lines[0]), 7)[0].quantity).toBe(7);
    expect(setQuantity(lines, lineKey(lines[0]), 0)[0].quantity).toBe(1);
    expect(setQuantity(lines, lineKey(lines[0]), 5000)[0].quantity).toBe(99);
    expect(setQuantity(lines, lineKey(lines[0]), 'abc')[0].quantity).toBe(1);
    expect(setQuantity(lines, lineKey(lines[0]), 2.9)[0].quantity).toBe(2);
  });

  it('removes a line, and only that one', () => {
    const lines = addLine(addLine([], line()), line({ productId: B }));
    const left = removeLine(lines, `${A}:`);
    expect(left.map((l) => l.productId)).toEqual([B]);
  });

  it('counts items, not lines', () => {
    const lines = addLine(addLine([], line({ quantity: 2 })), line({ productId: B, quantity: 3 }));
    expect(itemCount(lines)).toBe(5);
    expect(itemCount([])).toBe(0);
  });

  it('never grows past the API\'s limit on lines', () => {
    let lines = [];
    for (let i = 0; i < MAX_LINES + 10; i += 1) lines = addLine(lines, line({ productId: `01H8XGJWBWBAQ4Z4RZ4ZQ${String(i).padStart(5, '0')}`.slice(0, 26) }));
    expect(lines.length).toBeLessThanOrEqual(MAX_LINES);
  });

  it('sends the API ids and quantities only — never a price or a name', () => {
    const lines = addLine([], line({ variantId: V, quantity: 2 }));
    expect(toQuoteLines(lines)).toEqual([{ productId: A, variantId: V, quantity: 2 }]);
    expect(toQuoteLines(addLine([], line()))).toEqual([{ productId: A, quantity: 1 }]);
  });

  it('totals are formatted from integer paise', () => {
    expect(money(129900)).toBe('₹1,299');
    expect(money(129950)).toBe('₹1,299.50');
    expect(money(undefined)).toBe('₹0');
    expect(clampQuantity(NaN)).toBe(1);
  });

  describe('a stored cart is untrusted', () => {
    it('keeps well-formed lines and drops everything else', () => {
      const stored = [line(), { productId: 'nope', quantity: 1 }, null, 'x', { productId: A }, line({ productId: B, quantity: 500, imageUrl: 'javascript:alert(1)', unitPrice: 'free' })];
      const clean = sanitize(stored);
      expect(clean.map((l) => l.productId)).toEqual([A, B]);
      expect(clean[1].quantity).toBe(99);
      expect(clean[1].imageUrl).toBeUndefined();
      expect(clean[1].unitPrice).toBe(0);
    });

    it('is empty for anything that is not a list, and removes duplicates', () => {
      expect(sanitize('x')).toEqual([]);
      expect(sanitize({ a: 1 })).toEqual([]);
      expect(sanitize([line(), line()])).toHaveLength(1);
    });
  });
});
