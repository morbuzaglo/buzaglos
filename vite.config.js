import { defineConfig } from 'vite';

// Relative base so the same build works at https://<user>.github.io/<repo>/ and locally.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020', chunkSizeWarningLimit: 2000,
    rollupOptions: { input: { main: 'index.html', admin: 'admin/index.html' } },
  },
  server: { host: true, port: 5173 },
});
