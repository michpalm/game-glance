import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['checks/**/*.live.test.ts'],
        setupFiles: ['tests/setup.ts'],
    },
});
