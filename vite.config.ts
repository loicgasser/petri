import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
