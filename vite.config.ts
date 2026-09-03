import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5173,
    // Bundled set JSON lives outside src/ and is dynamically imported, so the
    // dev server has to be allowed to serve it.
    fs: {
      allow: ['bundled'],
    },
  },
});
