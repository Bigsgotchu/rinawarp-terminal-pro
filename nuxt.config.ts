// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  // App configuration
  app: {
    head: {
      title: 'RinaWarp Terminal - AI-Powered Terminal Emulator',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          hid: 'description',
          name: 'description',
          content: 'Advanced terminal emulator with AI assistance for developers and enterprises',
        },
      ],
      link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
    },
  },

  // CSS framework
  css: ['@/assets/css/main.css', '@/styles/main.css'],

  // Modules
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@vueuse/nuxt', '@nuxtjs/color-mode'],

  // Runtime config
  runtimeConfig: {
    // Private keys (only available on server-side)
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,

    // Public keys (exposed to frontend)
    public: {
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    },
  },

  // Server-side rendering
  ssr: true,

  // Build configuration
  build: {
    transpile: ['@stripe/stripe-js'],
  },

  // Nitro config for deployment
  nitro: {
    preset: 'node-server', // Change to your preferred deployment target
  },

  // Route rules
  routeRules: {
    '/': { prerender: true },
    '/pricing': { prerender: true },
    '/download': { prerender: true },
    '/api/**': { cors: true },
  },

  // Tailwind CSS
  tailwindcss: {
    cssPath: '~/assets/css/tailwind.css',
    configPath: 'tailwind.config.js',
    exposeConfig: false,
    viewer: true,
  },

  // Color mode
  colorMode: {
    preference: 'dark',
    fallback: 'light',
    hid: 'nuxt-color-mode-script',
    globalName: '__NUXT_COLOR_MODE__',
    componentName: 'ColorScheme',
    classPrefix: '',
    classSuffix: '-mode',
    storageKey: 'nuxt-color-mode',
  },
});
