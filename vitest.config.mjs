import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const here = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  // Next lets components live in .js files; treat every .js/.jsx source as JSX.
  esbuild: { jsx: 'automatic', loader: 'jsx', include: /\.(js|jsx)$/, exclude: /node_modules/ },
  resolve: {
    alias: [
      { find: '@', replacement: here('.') },
      // `server-only` throws unless bundled for the server; tests run on the server.
      { find: /^server-only$/, replacement: here('./tests/stubs/server-only.js') },
    ],
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{js,jsx}'],
    setupFiles: ['tests/setup.js'],
  },
});
