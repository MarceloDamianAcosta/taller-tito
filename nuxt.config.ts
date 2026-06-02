// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    'nuxt-auth-utils'
  ],

  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  ui: {
    fonts: false
  },

  runtimeConfig: {
    session: {
      // Secreto para sellar la cookie de sesión (nuxt-auth-utils). NO es la password
      // de login de Tito (esa vive bcrypt-hasheada en la DB). Se inyecta por env
      // NUXT_SESSION_PASSWORD desde .env — debe ser FIJO (≥32 chars) o Tito se
      // deslogueará en cada reinicio. Sin valor, la app no arranca en prod.
      password: '',
      cookie: {
        secure: false,
        sameSite: 'lax' as const,
        httpOnly: true
      }
    }
  },

  routeRules: {
    '/api/**': { cors: false }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
