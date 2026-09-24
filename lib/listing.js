export const SORTS = ['newest', 'price_asc', 'price_desc', 'popular', 'discount'];
const CURSOR = /^[A-Za-z0-9_.-]{1,600}$/;

/** Query values a listing page will pass to the API: known sorts, a cursor of the right shape, a bounded search text. */
export const parseListingParams = (searchParams = {}) => {
  const one = (v) => (Array.isArray(v) ? v[0] : v);
  const sort = SORTS.includes(one(searchParams.sort)) ? one(searchParams.sort) : 'newest';
  const cursorRaw = one(searchParams.cursor);
  const q = String(one(searchParams.q) ?? '').trim().slice(0, 80);
  return { sort, cursor: cursorRaw && CURSOR.test(cursorRaw) ? cursorRaw : undefined, q };
};
