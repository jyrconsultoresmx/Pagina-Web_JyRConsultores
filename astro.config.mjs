import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import icon from 'astro-icon';

import netlify from '@astrojs/netlify';

import react from '@astrojs/react';

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [icon({
    include: {
      mdi: ['*'], // Esto permite usar cualquier icono de la colección MDI
      lucide: ['*'], // Si decides usar los que te pasé antes
    },
  }), react()],
  output: 'static',
  adapter: netlify(),
});