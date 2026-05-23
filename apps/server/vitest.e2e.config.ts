import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        parser: { syntax: 'typescript', decorators: true, dynamicImport: true },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
          useDefineForClassFields: false,
        },
        target: 'es2022',
        keepClassNames: true,
      },
      sourceMaps: true,
    }),
  ],
  test: {
    globals: false,
    environment: 'node',
    include: ['test/e2e/**/*.e2e-spec.ts'],
    globalSetup: ['./test/e2e/global-setup.ts'],
    // env-setup must run before any AppModule import so ConfigModule reads the
    // test DATABASE_URL; reflect-metadata is needed for Nest DI.
    setupFiles: ['./test/e2e/env-setup.ts', './test/setup.ts'],
    // The suite shares one Postgres test DB and truncates between tests, so run
    // files serially in a single worker to avoid cross-file races.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
  resolve: {
    alias: [{ find: /^@\/(.*)$/, replacement: resolve(here, 'src') + '/$1' }],
  },
});
