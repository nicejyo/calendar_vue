import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
// http://localhost:8080
// https://app.cloudtype.io/@nicejyo/calendar:main/calendar-boot
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://port-0-calendar-api-m6647c5e231f83ec.sel4.cloudtype.app',
      },
    },
  },
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
