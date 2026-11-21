import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' lets the built site run from any sub-folder (e.g. GitHub Pages).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    fs: {
      // research/ holds unpublished photographs and reference material. The production build never
      // includes it, and this stops the development server (npm run dev) from serving it either.
      // The first six entries are Vite's own defaults, which this list replaces, so they are repeated.
      deny: ['.env', '.env.*', '*.{crt,pem,key,p12,pfx,cer,der}', '.npmrc', '.yarnrc.yml', '**/.git/**', '**/research/**'],
    },
  },
});
