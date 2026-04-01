import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import icon from 'astro-icon';

import netlify from '@astrojs/netlify';

import react from '@astrojs/react';

import sitemap from '@astrojs/sitemap';

export default defineConfig({
  build:{
    inlineStylesheets: 'always'
  },
  
  site: 'https://jyrconsultoresmx.com/',
  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [icon({
    include: {
      mdi: ['*'],
      lucide: ['*'], 
    },
  }), react(), sitemap()],
  output: 'static',
  adapter: netlify(),
});