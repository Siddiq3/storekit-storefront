import { PolicyLink } from './PolicyLink.jsx';
import { returnsLabel } from '@/lib/returns.js';

const ReturnIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 9h11a5 5 0 0 1 0 10H9" /><path d="m8 5-4 4 4 4" />
  </svg>
);

/** The store's return rule under the buy button, linking to its refund policy when that is shown. */
export function ReturnsNote({ returns, policy }) {
  if (!returns) return null;
  return (
    // A <div>, not a <p>: the policy dialog inside the link holds block content.
    <div className="sk-returns">
      <ReturnIcon />
      <span>{returnsLabel(returns)}</span>
      {policy ? <PolicyLink slug={policy.slug}>Details</PolicyLink> : null}
    </div>
  );
}
