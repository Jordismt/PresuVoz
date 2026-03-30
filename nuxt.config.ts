export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  runtimeConfig: {
    // IMPORTANTE: Estos nombres deben coincidir con lo que uses en el servidor
    groqKey: '', // Se llena con la variable GROQ_KEY de Vercel
    codigoLicencia: '' // Se llena con la variable CODIGO_LICENCIA de Vercel
  },
  app: {
    head: {
      title: 'PresuVoz Enterprise - IA Sales Assistant',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0' },
        { name: 'theme-color', content: '#2563eb' }
      ]
    }
  }
})