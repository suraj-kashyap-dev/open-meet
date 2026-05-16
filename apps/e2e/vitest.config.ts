import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const webRoot = resolve(__dirname, '../web');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': webRoot,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/unit/setup.ts'],
    include: ['tests/unit/**/*.spec.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**'],
    css: false,
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      reporter: ['text', 'html'],
      include: [
        '../web/components/**/*.{ts,tsx}',
        '../web/hooks/**/*.{ts,tsx}',
        '../web/lib/**/*.{ts,tsx}',
        '../web/services/**/*.{ts,tsx}',
        '../web/store/**/*.{ts,tsx}',
      ],
      exclude: ['**/*.d.ts', '../web/components/ui/**'],
    },
  },
});
