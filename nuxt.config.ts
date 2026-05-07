import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  srcDir: 'app',
  devtools: { enabled: true },
  ssr: true,

  css: ['~/assets/css/tailwind.css', '~/assets/css/theme.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  app: {
    head: {
      title: 'Basin AI',
      htmlAttrs: { lang: 'en' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },

  runtimeConfig: {
    // Server-only upstream URL for the FSM Assistant. Browser calls go through
    // the same-origin Nitro proxy at /api/basin-ai to sidestep CORS against
    // the Azure container.
    basinAiUpstreamUrl:
      process.env.BASIN_AI_UPSTREAM_URL ||
      'https://ca-basinai-fsm-api-dev.grayriver-cc62666b.southeastasia.azurecontainerapps.io',

    public: {
      keycloak: {
        url: process.env.KEYCLOAK_URL || 'http://localhost:8080',
        realm: process.env.KEYCLOAK_REALM || 'master',
        clientId: process.env.KEYCLOAK_CLIENT_ID || 'seek-dev'
      },
      seekAppUrl: process.env.NUXT_PUBLIC_SEEK_APP_URL || 'http://localhost:3000',
      seekApiBase: process.env.NUXT_PUBLIC_SEEK_API_BASE || 'http://localhost:8081/api/v1',
      basinAiApiBase: process.env.NUXT_PUBLIC_BASIN_AI_API_BASE || '/api/basin-ai',

      // Phase 1 only: bypass auth middleware so /` is reachable without tokens.
      // Active only in dev (`import.meta.dev`) AND when the env flag is set.
      // Remove before production.
      authBypass: process.env.NUXT_PUBLIC_AUTH_BYPASS === 'true',

      // Optional dev-only identity injected into FSM requests when authBypass
      // is on (the FSM API still expects an X-User-Id header). Empty in prod.
      devUserId: process.env.NUXT_PUBLIC_DEV_USER_ID || '',
      devUsername: process.env.NUXT_PUBLIC_DEV_USERNAME || '',
    },
  },
})
