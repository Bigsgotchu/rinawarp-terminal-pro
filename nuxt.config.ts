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
    firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY,

    // Public keys (exposed to frontend)
    public: {
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.FIREBASE_APP_ID,
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
    preset: 'firebase',
    firebase: {
      gen: 2,
      httpsOptions: {
        region: 'us-central1',
        maxInstances: 10,
      },
    },
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
