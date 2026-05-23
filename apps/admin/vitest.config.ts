import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['test/unit/**/*.spec.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
    setupFiles: ['./test/setup.ts'],
    // Workspace packages ship as TS/TSX source — inline them so Vitest transforms
    // them instead of treating them as pre-built externals.
    server: {
      deps: {
        inline: [/^@open-meet\//],
      },
    },
  },
  resolve: {
    alias: [{ find: /^@\/(.*)$/, replacement: resolve(here, '.') + '/$1' }],
  },
});
