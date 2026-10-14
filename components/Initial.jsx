/** A product with no photo yet, in a small slot (cart and order lines): its first letter on a tint of the store's colour. */
export function Initial({ name }) {
  const letter = String(name ?? '').trim().charAt(0).toUpperCase() || '?';
  return <span className="sk-initial" aria-hidden="true">{letter}</span>;
}

/** The same, in a card or gallery slot: the product's name set as a label on the tint, so the slot still says what it is. */
export function NamePlate({ name }) {
  return <span className="sk-nameplate" aria-hidden="true"><span>{String(name ?? '').trim()}</span></span>;
}
