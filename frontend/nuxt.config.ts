// https://nuxt.com/docs/api/configuration/nuxt-config
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@nuxtjs/i18n'],
  css: ['~/assets/css/main.css'],
  i18n: {
    defaultLocale: 'en',
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'cn', name: 'Chinese', file: 'cn.json' }
    ]
  },
  vite: {
    plugins: [
      nodePolyfills({
        // 启用所需的 Node.js polyfills
        include: ['buffer', 'crypto', 'stream', 'util', 'process'],
        globals: {
          Buffer: true,
          global: true,
          process: true
        }
      })
    ]
  }
})
