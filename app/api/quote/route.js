import { quoteSchema } from '@storekit/validation';
import { handleStorePost } from '@/lib/bff.js';
import { quoteCart } from '@/lib/store-data.js';

// The API's own strict schema: a `businessId`, `slug` or any other unknown field is a 400, not something to forward.
export const POST = (request) =>
  handleStorePost(request, {
    schema: quoteSchema,
    run: (input, ctx) => quoteCart(ctx.slug, ctx, input),
  });
