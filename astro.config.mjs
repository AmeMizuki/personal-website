import { fileURLToPath, URL } from 'node:url'

import vue from '@astrojs/vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

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
  site: 'https://example.com', // TODO: replace with the real production domain before deploying
  integrations: [vue()],
  markdown: {
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
