import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://jm1260.github.io',
  base: '/Growth-Record',
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
  },
});

