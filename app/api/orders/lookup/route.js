import { orderLookupSchema } from '@storekit/validation';
import { handleStorePost } from '@/lib/bff.js';
import { findOrder, toPublicOrder } from '@/lib/store-data.js';

// "Track order": order number plus the mobile number on the order. (A tracking link uses the order page instead.)
const schema = orderLookupSchema.innerType().omit({ token: true }).strict().refine((v) => Boolean(v.orderNumber && v.mobile), {
  message: 'Enter your order number and mobile number',
});

export const POST = (request) =>
  handleStorePost(request, {
    schema,
    run: async (input, ctx) => toPublicOrder(await findOrder(ctx.slug, ctx, input)),
  });
