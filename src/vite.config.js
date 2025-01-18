import { defineConfig } from 'vite';

export default defineConfig({
  base: '/codorebyu/',
  build: {
    outDir: '../docs',
    emptyOutDir: true,
  }
});
