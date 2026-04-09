/**
 * Rate Limiting Middleware — Sliding Window
 *
 * Aplica límites distintos por ruta:
 *   /api/generar     → 20 req / 60s por userId (caro en Groq)
 *   /api/transcribir → 30 req / 60s por userId (caro en Groq)
 *   /api/stripe/*    → 10 req / 60s por userId
 *   resto de /api/*  → 60 req / 60s por IP
 *
 * En producción sustituye el Map en memoria por Redis/Upstash
 * para que funcione entre instancias serverless.
 */

import { defineEventHandler, getRequestURL, getHeader, createError } from "h3";

interface WindowEntry {
  timestamps: number[];
}

// Map en memoria — válido para Vercel con una sola instancia o dev local.
// Para multi-instancia usa: https://upstash.com/docs/redis/sdks/ts/ratelimit
const store = new Map<string, WindowEntry>();

// Limpia entradas antiguas cada 5 minutos para evitar memory leaks
setInterval(() => {
  const cutoff = Date.now() - 120_000;
  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}, 300_000);

interface RuleConfig {
  limit: number;
  windowMs: number;
}

const ROUTE_RULES: Record<string, RuleConfig> = {
  "/api/generar": { limit: 20, windowMs: 60_000 },
  "/api/transcribir": { limit: 30, windowMs: 60_000 },
  "/api/stripe/checkout": { limit: 10, windowMs: 60_000 },
  "/api/stripe/portal": { limit: 10, windowMs: 60_000 },
};
const GUEST_RULE: RuleConfig = { limit: 1, windowMs: 24 * 60 * 60 * 1000 }; // 1 uso cada 24h
const DEFAULT_RULE: RuleConfig = { limit: 60, windowMs: 60_000 };

function isAllowed(key: string, rule: RuleConfig): boolean {
  const now = Date.now();
  const entry = store.get(key) ?? { timestamps: [] };

  // Elimina timestamps fuera de la ventana
  entry.timestamps = entry.timestamps.filter((t) => now - t < rule.windowMs);

  if (entry.timestamps.length >= rule.limit) {
    store.set(key, entry);
    return false;
  }

  entry.timestamps.push(now);
  store.set(key, entry);
  return true;
}

export default defineEventHandler((event) => {
  const url = getRequestURL(event);
  const pathname = url.pathname;

  // Solo aplica a rutas de API
  if (!pathname.startsWith("/api/")) return;

  const rule = ROUTE_RULES[pathname] ?? DEFAULT_RULE;

  // Preferimos userId (del token) para rutas de API autenticadas.
  // Si no hay token aún, usamos IP como fallback.
  const authHeader = getHeader(event, "authorization") ?? "";
  const ip =
    getHeader(event, "x-forwarded-for")?.split(",")[0]?.trim() ?? getHeader(event, "x-real-ip") ?? "unknown";

  // Clave: combinamos ruta + identificador para no penalizar IPs compartidas (NAT, VPN)
  const identifier = authHeader ? `token:${authHeader.slice(-16)}` : `ip:${ip}`;
  const key = `${pathname}:${identifier}`;
  // DETECCIÓN DE INVITADO
  if (!authHeader && (pathname === "/api/generar" || pathname === "/api/transcribir")) {
    const ip = getHeader(event, "x-forwarded-for")?.split(",")[0] || "unknown";
    const guestKey = `guest:${pathname}:${ip}`;

    if (!isAllowed(guestKey, GUEST_RULE)) {
      throw createError({
        statusCode: 429,
        statusMessage: "Ya has usado tu prueba gratuita por hoy. ¡Regístrate para continuar!",
      });
    }
    return;
  }
  if (!isAllowed(key, rule)) {
    const retryAfter = Math.ceil(rule.windowMs / 1000);
    // Añadimos el header estándar Retry-After
    event.node.res.setHeader("Retry-After", String(retryAfter));
    event.node.res.setHeader("X-RateLimit-Limit", String(rule.limit));
    throw createError({
      statusCode: 429,
      statusMessage: "Demasiadas peticiones. Espera un momento e inténtalo de nuevo.",
    });
  }
});
