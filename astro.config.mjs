import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://jzw1340031470-png.github.io',
  base: '/Growth-Record',
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
  },
});

