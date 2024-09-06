import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

const plugins = [
  svelte(),
]

if(process.env.BASE_URL) {
  plugins.push({
    name: 'html-transform',
    transformIndexHtml(html) {
      return html.replaceAll(
          '/assets/',
          `/${process.env.BASE_URL}/assets/`,
      )
    },
  })
}

// https://vitejs.dev/config/
export default defineConfig({plugins})
