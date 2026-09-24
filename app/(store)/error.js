'use client';

import { StateScreen } from '@/components/StateScreen.jsx';

// The message and stack of what failed are never shown: a shopper cannot use them and they can carry internals.
export default function StoreError({ reset }) {
  return <StateScreen kind="error" retry={reset} homeLink />;
}
