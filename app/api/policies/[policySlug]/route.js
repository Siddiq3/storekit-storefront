import { failure, json, respondToError } from '@/lib/bff.js';
import { getRequestContext } from '@/lib/request.js';
import { getPolicy } from '@/lib/store-data.js';

/**
 * One policy of the store this request is for, for the policy dialog. The store comes from the
 * host (as for every page), never from the request; a hidden or unknown policy is a 404.
 */
export const GET = async (_request, { params }) => {
  const ctx = await getRequestContext();
  if (!ctx) return failure(404, 'STORE_NOT_FOUND', 'Store not found.');
  try {
    const { slug, title, content } = await getPolicy(ctx.slug, ctx, (await params).policySlug);
    return json({ slug, title, content });
  } catch (error) {
    return respondToError(error);
  }
};
