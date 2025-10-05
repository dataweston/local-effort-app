import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['backend/**/*.test.js', 'tests/**/*.test.{js,ts}'],
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
});
