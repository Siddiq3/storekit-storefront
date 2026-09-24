import Link from 'next/link';

/**
 * The pages a shopper sees when there is nothing to show. Plain words, no cause a shopper cannot act on, no stack
 * or backend message. Used both outside a store (no theme yet) and inside one.
 */
const COPY = {
  'store-not-found': { title: 'We could not find this store', message: 'Check the address you were given, or ask the shop to send you their link again.' },
  'invalid-host': { title: 'This address is not valid', message: 'The web address you used cannot be a store. Check it and try again.' },
  unavailable: { title: 'The store is not reachable right now', message: 'We could not load it just now. Please try again in a moment.' },
  inactive: { title: 'This store is not open right now', message: 'The shop is not taking visitors at the moment. Please check back later.' },
  'product-not-found': { title: 'We could not find that product', message: 'It may have been removed or the link may be wrong.' },
  'product-unavailable': { title: 'This product is not available', message: 'It is not on sale right now. Have a look at what else the shop has.' },
  'page-not-found': { title: 'Page not found', message: 'There is nothing at this address.' },
  error: { title: 'Something went wrong', message: 'Please try again. If it keeps happening, tell the shop.' },
  'checkout-failure': { title: 'We could not place your order', message: 'Nothing has been charged. Please check your details and try again.' },
};

export function StateScreen({ kind, title, message, retry, homeLink = false, children }) {
  const copy = COPY[kind] ?? COPY.error;
  return (
    <section className="sk-state" role="alert" aria-live="polite" data-state={kind}>
      <h1>{title ?? copy.title}</h1>
      <p>{message ?? copy.message}</p>
      {retry ? <button type="button" className="sk-button" onClick={retry}>Try again</button> : null}
      {homeLink ? <Link href="/" className="sk-button sk-button-quiet">Back to the shop</Link> : null}
      {children}
    </section>
  );
}
