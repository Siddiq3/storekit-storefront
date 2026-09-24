const OPTIONS = [
  ['newest', 'Newest'], ['popular', 'Popular'], ['price_asc', 'Price: low to high'],
  ['price_desc', 'Price: high to low'], ['discount', 'Biggest discount'],
];

/** A plain GET form: sorting works without scripts and the result is a shareable link. */
export function SortForm({ sort, hidden = {} }) {
  return (
    <form className="sk-sort" method="get">
      {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <label className="sk-visually-hidden" htmlFor="sk-sort">Sort by</label>
      <select id="sk-sort" name="sort" defaultValue={sort}>
        {OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>{' '}
      <button className="sk-button sk-button-quiet" type="submit">Sort</button>
    </form>
  );
}
