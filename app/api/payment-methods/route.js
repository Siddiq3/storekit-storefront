import { failure, json, respondToError } from '@/lib/bff.js';
import { getRequestContext } from '@/lib/request.js';
import { getSettings } from '@/lib/store-data.js';

/** Public payment availability for the resolved store; never payment account details. */
export async function GET() {
  const ctx = await getRequestContext();
  if (!ctx) return failure(404, 'STORE_NOT_FOUND', 'Store not found.');
  try {
    const settings = await getSettings(ctx.slug, ctx);
    return json({ paymentMethods: (settings.paymentMethods ?? []).filter((m) => m === 'COD' || m === 'UPI_MANUAL') });
  } catch (error) { return respondToError(error); }
}
