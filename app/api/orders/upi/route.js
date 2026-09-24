import { upiSubmissionSchema } from '@storekit/validation';
import { handleStorePost } from '@/lib/bff.js';
import { submitUpiReference, toPublicOrder } from '@/lib/store-data.js';

// No screenshot upload in the storefront: only the payment reference.
const schema = upiSubmissionSchema.omit({ screenshotKey: true });

export const POST = (request) =>
  handleStorePost(request, {
    schema,
    run: async (input, ctx) => toPublicOrder(await submitUpiReference(ctx.slug, ctx, input)),
  });
