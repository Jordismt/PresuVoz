export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  runtimeConfig: {
    // Dejamos un valor por defecto o vacío. 
    // Nuxt lo sobrescribirá con lo que haya en el .env automáticamente.
    groqKey: '' 
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