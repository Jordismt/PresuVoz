// nuxt.config.ts
// Configuración PRO: SEO + Seguridad + Supabase

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",

  // Solo habilitar devtools si no estamos en producción
  devtools: { enabled: process.env.NODE_ENV !== "production" },

  // Añadimos @nuxtjs/supabase a tus módulos
  modules: ["@nuxtjs/supabase", "@nuxtjs/tailwindcss"],

  // ── 1. VARIABLES DE ENTORNO ───────────────────────────────────────────────
  runtimeConfig: {
    // PRIVADAS (Solo accesibles en la carpeta server/)
    groqKey: process.env.GROQ_KEY ?? "",
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",

    // PÚBLICAS (Accesibles en cliente y servidor)
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL ?? "",
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    },
  },

  // ── 2. CONFIGURACIÓN DE SUPABASE MODULE ───────────────────────────────────
  // @ts-ignore - Esto quitará el error rojo si TS se pone cabezón
  supabase: {
    redirectOptions: {
      login: "/auth",
      callback: "/auth/callback",
      exclude: ["/", "/legal/*", "/oficios/*"],
    },
  },
  // ── 3. SEGURIDAD DE RUTAS Y CACHE (NITRO) ────────────────────────────────
  nitro: {
    routeRules: {
      "/**": {
        headers: {
          "Permissions-Policy": "microphone=(self)",
        },
      },
      // Evitamos que el navegador guarde en cache los presupuestos generados
      "/api/generar": {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      },
      "/api/transcribir": {
        headers: { "Cache-Control": "no-store" },
      },
      // Cacheamos la Home 1 hora para que vuele en Google
      "/": {
        headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
      },
    },
  },

  // ── 4. SEO Y METADATOS (Tu configuración actual mejorada) ────────────────
  app: {
    head: {
      htmlAttrs: { lang: "es" },
      title: "PresuVoz | Genera Presupuestos en 30 Segundos (Voz o Texto) 🎙️",
      meta: [
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
        },
        {
          "http-equiv": "Permissions-Policy",
          content: "microphone=(self)",
        },
        { charset: "utf-8" },

        // Seguridad básica del navegador
        { "http-equiv": "X-Content-Type-Options", content: "nosniff" },

        // SEO Estándar
        {
          name: "description",
          content:
            "La herramienta definitiva para autónomos. Dicta tus trabajos y genera presupuestos en PDF al instante con IA.",
        },
        {
          name: "keywords",
          content: "presupuestos voz, app autónomos, facturación ia, presupuestos rápidos, reformas",
        },

        // Open Graph / Facebook / WhatsApp
        { property: "og:type", content: "website" },
        { property: "og:title", content: "PresuVoz - El fin de los presupuestos manuales" },
        {
          property: "og:description",
          content: "Dicta, genera y envía. La IA que entiende a los profesionales.",
        },
        { property: "og:image", content: "/og-image.jpg" },
        { property: "og:url", content: "https://presuvoz.es" },

        // Twitter Card
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "PresuVoz | Presupuestos por Voz" },
      ],
      link: [
        // Favicons (Mantengo tus rutas actuales)
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
        { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
        { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
        { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
        { rel: "manifest", href: "/site.webmanifest" },
      ],
    },
  },
});
