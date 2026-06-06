import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// The demo consumes the library as a linked dependency (`file:..`).
// Because the link points outside this project root, we (1) allow Vite to
// serve files from the parent directory and (2) dedupe React so the linked
// package and the demo share a single React instance (otherwise hooks break).
export default defineConfig({
    plugins: [react()],
    resolve: {
        dedupe: ['react', 'react-dom'],
    },
    server: {
        fs: {
            allow: ['..'],
        },
    },
});
