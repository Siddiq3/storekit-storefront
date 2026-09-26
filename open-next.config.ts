import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Defaults: no incremental cache, no tag cache. Every storefront page is rendered per request (the store layout is
// `force-dynamic`), so there is nothing for OpenNext to cache or revalidate.
export default defineCloudflareConfig();
