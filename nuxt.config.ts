export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  runtimeConfig: {
    groqKey: process.env.GROQ_KEY,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY
    }
  },
  app: {
    head: {
      htmlAttrs: {
        lang: 'es' // 1. Indica a Google que tu web es para público español
      },
      title: 'PresuVoz | Genera Presupuestos en 30 Segundos (Voz o Texto) 🎙️',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0' },
        { charset: 'utf-8' },
        
        // SEO Estándar
        { name: 'description', content: 'La herramienta definitiva para autónomos. Dicta tus trabajos y genera presupuestos en PDF al instante con IA. ¡Ahorra horas de oficina!' },
        { name: 'keywords', content: 'presupuestos voz, app autónomos, facturación ia, presupuestos rápidos, fontaneros, electricistas, reformas' },
        { name: 'author', content: 'PresuVoz AI' },

        // Open Graph / Facebook (Para que el link se vea pro en WhatsApp)
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'PresuVoz - El fin de los presupuestos manuales' },
        { property: 'og:description', content: 'Dicta, genera y envía. La IA que entiende a los profesionales de las reformas y servicios.' },
        { property: 'og:image', content: '/og-image.jpg' }, // Asegúrate de subir una foto a la carpeta /public
        { property: 'og:url', content: 'https://presuvoz.es' }, // Cambia por tu dominio real

        // Twitter Card
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'PresuVoz | Presupuestos por Voz' },
        { name: 'twitter:description', content: 'Crea PDFs profesionales en 30 segundos sin tocar el teclado.' },
      ],
link: [
        // 1. Favicon estándar para PC
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        
        // 2. Icono para iPhone/iPad (Pantalla de inicio)
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        
        // 3. Iconos PNG para Android y navegadores modernos
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        
        // 4. Manifest para Android (opcional pero muy recomendado)
        { rel: 'manifest', href: '/site.webmanifest' }
      ]
    }
  }
})