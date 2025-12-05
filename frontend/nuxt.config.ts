// https://nuxt.com/docs/api/configuration/nuxt-config
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@nuxtjs/i18n'],

  // Runtime config - 可通过环境变量覆盖
  // 公开配置（客户端可访问）使用 NUXT_PUBLIC_ 前缀
  runtimeConfig: {
    public: {
      // 区块链配置
      blogHubContractAddress: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
      rpcUrl: 'https://sepolia.optimism.io',
      // Irys 配置
      irysNetwork: 'devnet' as 'mainnet' | 'devnet',
      // 应用配置
      appName: 'DBlog',
      appVersion: '1.0.0',
      // Arweave 网关列表
      arweaveGateways: ['https://gateway.irys.xyz', 'https://arweave.net', 'https://arweave.dev']
    }
  },
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
