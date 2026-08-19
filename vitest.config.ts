import { defineConfig } from 'vitest/config';

// functions/lib/* 走 ESM, vitest 用同样的 loader
// pages-functions 的 D1Database 仅作为类型,不真的查库,所以不引入 miniflare
export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**', '.wrangler/**'],
  },
  esbuild: {
    target: 'es2022',
  },
});
