import { afterEach, vi } from 'vitest';

// A predictable environment for every test; individual tests override what they exercise.
process.env.NODE_ENV = 'test';
process.env.API_BASE_URL = 'https://api.test.local/v1';
process.env.STOREFRONT_ROOT_URL = 'https://storekit.site';
process.env.EDGE_SHARED_SECRET = 'test-edge-secret-that-is-long-enough-for-validation-1234';
delete process.env.CLIENT_IP_HEADER;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
