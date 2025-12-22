import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    globals: true,
    coverage: {
      reportsDirectory: 'coverage',
    },
  },
  css: false, // Disable CSS processing for tests
  esbuild: {
    // Skip postcss processing
    target: 'node18',
  },
});

