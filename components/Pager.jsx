import Link from 'next/link';

/** "Load more" as an ordinary link to the next page, so listings are crawlable and work without scripts. */
export function Pager({ pathname, params = {}, nextCursor }) {
  if (!nextCursor) return null;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  query.set('cursor', nextCursor);
  return (
    <div className="sk-pager">
      <Link className="sk-button sk-button-quiet" href={`${pathname}?${query.toString()}`} rel="next">Show more</Link>
    </div>
  );
}
