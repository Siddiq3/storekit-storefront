/** A product with no photo yet: its first letter, large, on a tint of the store's colour (see .sk-no-photo). */
export function Initial({ name }) {
  const letter = String(name ?? '').trim().charAt(0).toUpperCase() || '?';
  return <span className="sk-initial" aria-hidden="true">{letter}</span>;
}
