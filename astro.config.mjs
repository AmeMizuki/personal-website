import { fileURLToPath, URL } from 'node:url'

import vue from '@astrojs/vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'
import remarkMedia from './src/lib/remark-media.mjs'

function rehypeLazyImages() {
  return (tree) => {
    function visit(node) {
      if (node.tagName === 'img' && node.properties && !('loading' in node.properties)) {
        node.properties.loading = 'lazy'
      }
      node.children?.forEach(visit)
    }
    visit(tree)
  }
}

export default defineConfig({
  site: process.env.SITE_URL || 'https://example.com',
  integrations: [vue()],
  markdown: {
    remarkPlugins: [remarkMedia],
    rehypePlugins: [rehypeLazyImages],
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    ssr: {
      noExternal: ['gsap'],
    },
  },
})
