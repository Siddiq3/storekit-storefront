import { createOrderSchema } from '@storekit/validation';
import { handleStorePost, failure, IDEMPOTENCY_KEY, sameOrigin } from '@/lib/bff.js';
import { createOrder, toPublicOrder } from '@/lib/store-data.js';

/**
 * Places an order: COD or UPI_MANUAL, the only two methods the API has. The client supplies an idempotency key that
 * stays the same for every retry of one checkout attempt, so a dropped connection cannot become two orders.
 */
export const POST = async (request) => {
  const key = request.headers.get('x-idempotency-key') ?? '';
  if (sameOrigin(request) && !IDEMPOTENCY_KEY.test(key)) {
    return failure(400, 'VALIDATION_ERROR', 'Something went wrong. Please try again.');
  }

  return handleStorePost(request, {
    schema: createOrderSchema,
    status: 201,
    run: async (input, ctx) => {
      const confirmation = await createOrder(ctx.slug, ctx, input, key);
      // The order id is the API's internal key; the shopper's handle is the tracking token.
      return toPublicOrder(confirmation);
    },
  });
};
