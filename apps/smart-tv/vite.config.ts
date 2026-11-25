import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base: './',
  worker:{format:'iife'},
  plugins: [
    react(),
    {
      name: 'packaged-tv-classic-script',
      apply: 'build',
      // Packaged apps must not depend on local file ES-module CORS behavior.
      transformIndexHtml: {
        order: 'post',
        handler: (html) => html.replace(/ type="module"/g, ' defer').replace(/ crossorigin/g, ''),
      },
    },
  ],
  build: {
    target: 'chrome85',
    modulePreload: false,
    rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } },
  },
});
