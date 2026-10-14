'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getJson } from '@/lib/client-api.js';

const Methods = createContext(null);
export const useAvailablePaymentMethods = (fallback) => useContext(Methods) ?? fallback;

/** Keep payment claims and checkout in sync even when Next preserves an open store layout. */
export function PaymentAvailability({ initialMethods, children }) {
  const [methods, setMethods] = useState(initialMethods);
  const pathname = usePathname();
  useEffect(() => { setMethods(initialMethods); }, [initialMethods]);
  useEffect(() => {
    let mounted = true;
    let running = false;
    const refresh = async () => {
      if (running || document.visibilityState === 'hidden') return;
      running = true;
      try {
        const result = await getJson('/api/payment-methods');
        if (mounted && result.ok && Array.isArray(result.data?.paymentMethods)) {
          setMethods(result.data.paymentMethods.filter((method) => method === 'COD' || method === 'UPI_MANUAL'));
        }
      } finally { running = false; }
    };
    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timer = window.setInterval(refresh, 30000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [pathname]);
  return <Methods.Provider value={methods}>{children}</Methods.Provider>;
}
