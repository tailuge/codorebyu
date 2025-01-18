import { defineConfig } from 'vite';

export default defineConfig({
  base: '/codorebyu/',
  build: {
    outDir: 'docs',
    root: 'src',
    emptyOutDir: true,
  }
});
