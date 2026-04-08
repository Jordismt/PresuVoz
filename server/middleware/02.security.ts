/**
 * Security Headers Middleware
 *
 * Añade headers de seguridad HTTP en TODAS las respuestas y aplica
 * CORS estricto solo al origen de producción.
 *
 * Orden: 01.rateLimit → 02.security (los middlewares se ejecutan por nombre)
 */

import { defineEventHandler, getRequestURL, getHeader, createError, setResponseHeader } from "h3";

const ALLOWED_ORIGIN = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";

export default defineEventHandler((event) => {
  const url = getRequestURL(event);
  const pathname = url.pathname;
  const method = event.node.req.method ?? "GET";
  const origin = getHeader(event, "origin") ?? "";

  // ── Security headers para TODAS las respuestas ──────────────────────────
  setResponseHeader(event, "X-Content-Type-Options", "nosniff");
  setResponseHeader(event, "X-Frame-Options", "DENY");
  setResponseHeader(event, "X-XSS-Protection", "1; mode=block");
  setResponseHeader(event, "Referrer-Policy", "strict-origin-when-cross-origin");
  setResponseHeader(event, "Permissions-Policy", "microphone=(self), camera=(), geolocation=()");

  // HSTS solo en producción (Vercel ya lo pone, pero lo forzamos también)
  if (process.env.NODE_ENV === "production") {
    setResponseHeader(event, "Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  // CSP básico — ajusta según tus CDNs reales
  setResponseHeader(
    event,
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // unsafe-inline necesario para Nuxt SSR
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co https://api.groq.com https://api.stripe.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "font-src 'self'",
    ].join("; "),
  );

  // ── CORS solo para rutas /api/* ──────────────────────────────────────────
  if (!pathname.startsWith("/api/")) return;

  // El webhook de Stripe llega desde sus servidores, no desde un browser — necesita bypass de CORS
  if (pathname.startsWith("/api/stripe/webhook")) return;

  // Preflight OPTIONS — responde sin llegar al handler real
  if (method === "OPTIONS") {
    setResponseHeader(event, "Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    setResponseHeader(event, "Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    setResponseHeader(event, "Access-Control-Allow-Headers", "Content-Type, Authorization");
    setResponseHeader(event, "Access-Control-Max-Age", 86400);
    event.node.res.statusCode = 204;
    event.node.res.end();
    return;
  }

  // Verifica que el origin sea el permitido (solo en producción)
  if (process.env.NODE_ENV === "production" && origin && origin !== ALLOWED_ORIGIN) {
    throw createError({
      statusCode: 403,
      statusMessage: "Origin no permitido",
    });
  }

  setResponseHeader(event, "Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  setResponseHeader(event, "Access-Control-Allow-Credentials", "true");
});
