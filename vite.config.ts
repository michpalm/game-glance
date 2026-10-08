import path from 'path';

export default {
    server: {
        port: 5173,
        host: true,
    },
    resolve: {
        alias: {
            '@decky/ui': path.resolve(__dirname, 'playground/mocks/deckyUi.tsx'),
            '@decky/api': path.resolve(__dirname, 'playground/mocks/deckyApi.ts'),
        },
        dedupe: ['react', 'react-dom'],
    },
    esbuild: {
        jsx: 'automatic',
    },
};
