/**
 * Validadores de input para server/api/
 *
 * Centraliza la sanitización y validación de todos los datos
 * que llegan del cliente antes de procesarlos.
 */

import { createError } from "h3";

// ── Constantes ───────────────────────────────────────────────────────────────

export const MAX_TEXT_LENGTH = 2_000; // chars máx para el texto del presupuesto
export const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB — límite de Whisper API
export const ALLOWED_AUDIO_MIME = new Set([
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/mp4",
  "audio/ogg",
  "audio/ogg;codecs=opus",
  "audio/wav",
  "audio/mpeg",
  "audio/flac",
]);

export const ALLOWED_PRICE_IDS = new Set(
  [process.env.STRIPE_PRICE_PRO_MONTHLY ?? "", process.env.STRIPE_PRICE_CREDIT_SINGLE ?? ""].filter(Boolean),
);

export const ALLOWED_MODES = new Set(["subscription", "payment"]);

// ── Sanitizadores ────────────────────────────────────────────────────────────

/**
 * Sanitiza el texto del usuario antes de enviarlo a la IA.
 * Elimina caracteres de control pero preserva saltos de línea y tabulaciones.
 */
export function sanitizeText(raw: unknown): string {
  if (typeof raw !== "string") {
    throw createError({ statusCode: 400, statusMessage: "El campo texto debe ser una cadena" });
  }

  const text = raw
    // Caracteres de control excepto \t, \n, \r
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // Null bytes
    .replace(/\0/g, "")
    .trim();

  if (!text) {
    throw createError({ statusCode: 400, statusMessage: "Texto vacío" });
  }

  if (text.length > MAX_TEXT_LENGTH) {
    throw createError({
      statusCode: 400,
      statusMessage: `El texto no puede superar ${MAX_TEXT_LENGTH} caracteres`,
    });
  }

  return text;
}

/**
 * Valida un archivo de audio recibido por multipart.
 */
export function validateAudio(audioPart: any): void {
  // 1. Verificación radical: si no hay audioPart o data, lanzamos error y salimos
  if (!audioPart || !audioPart.data) {
    throw createError({ statusCode: 400, statusMessage: "No se recibió audio" });
  }

  // 2. Extraemos a constantes locales. TS ya sabe que audioPart.data existe aquí.
  const data = audioPart.data as Buffer;
  // Forzamos a string. Si no existe, será "". Así .split() nunca falla.
  const audioType = String(audioPart.type || "");

  if (data.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "Audio vacío" });
  }

  if (data.length > MAX_AUDIO_SIZE) {
    throw createError({
      statusCode: 413,
      statusMessage: `Máximo ${MAX_AUDIO_SIZE / 1024 / 1024}MB`,
    });
  }

  // Ahora TS sabe que audioType es string, por lo que .split() es seguro
  const mimeBase = audioType.split(";")[0]?.trim().toLowerCase() || "";

  if (mimeBase && !ALLOWED_AUDIO_MIME.has(audioType) && !ALLOWED_AUDIO_MIME.has(mimeBase)) {
    throw createError({
      statusCode: 415,
      statusMessage: `Formato no soportado: ${audioType}`,
    });
  }

  validateAudioMagicBytes(data);
}

/**
 * Comprueba los magic bytes del buffer para detectar archivos con MIME type falso.
 * No es infalible pero filtra los ataques más básicos.
 */
function validateAudioMagicBytes(buf: Buffer): void {
  if (buf.length < 8) {
    throw createError({ statusCode: 400, statusMessage: "Archivo de audio demasiado pequeño" });
  }

  // readUInt8 garantiza number (nunca undefined) — soluciona el error TS2532
  const [b0, b1, b2, b3, b4, b5, b6, b7] = [
    buf.readUInt8(0),
    buf.readUInt8(1),
    buf.readUInt8(2),
    buf.readUInt8(3),
    buf.readUInt8(4),
    buf.readUInt8(5),
    buf.readUInt8(6),
    buf.readUInt8(7),
  ];

  // WebM: 0x1A 0x45 0xDF 0xA3
  const isWebM = b0 === 0x1a && b1 === 0x45 && b2 === 0xdf && b3 === 0xa3;
  // MP4/M4A: "ftyp" en bytes 4-7
  const isMP4 = b4 === 0x66 && b5 === 0x74 && b6 === 0x79 && b7 === 0x70;
  // OGG: "OggS"
  const isOGG = b0 === 0x4f && b1 === 0x67 && b2 === 0x67 && b3 === 0x53;
  // WAV: "RIFF"
  const isWAV = b0 === 0x52 && b1 === 0x49 && b2 === 0x46 && b3 === 0x46;
  // MP3: "ID3" o frame sync 0xFF 0xFB/0xFA/0xF3
  const isMP3 =
    (b0 === 0x49 && b1 === 0x44 && b2 === 0x33) ||
    (b0 === 0xff && (b1 === 0xfb || b1 === 0xfa || b1 === 0xf3));

  if (!isWebM && !isMP4 && !isOGG && !isWAV && !isMP3) {
    throw createError({
      statusCode: 415,
      statusMessage: "El archivo no parece ser un audio válido",
    });
  }
}

/**
 * Valida los parámetros de Stripe Checkout.
 * IMPORTANTE: nunca confíes en el priceId del cliente — valídalo contra
 * tus propios IDs de precio configurados en variables de entorno.
 */
export function validateStripeCheckoutBody(body: unknown): { priceId: string; mode: string } {
  if (!body || typeof body !== "object") {
    throw createError({ statusCode: 400, statusMessage: "Body inválido" });
  }

  const { priceId, mode } = body as Record<string, unknown>;

  if (typeof priceId !== "string" || !priceId) {
    throw createError({ statusCode: 400, statusMessage: "priceId requerido" });
  }

  if (typeof mode !== "string" || !ALLOWED_MODES.has(mode)) {
    throw createError({ statusCode: 400, statusMessage: "mode inválido" });
  }

  // ⚠️ CRÍTICO: Si ALLOWED_PRICE_IDS está configurado, solo acepta precios conocidos
  if (ALLOWED_PRICE_IDS.size > 0 && !ALLOWED_PRICE_IDS.has(priceId)) {
    throw createError({ statusCode: 400, statusMessage: "Price ID no reconocido" });
  }

  return { priceId, mode };
}

/**
 * Valida la respuesta JSON de Groq antes de devolverla al cliente.
 * Evita que datos malformados lleguen al frontend.
 */
export function validateGroqPresupuesto(data: unknown): {
  cliente: string;
  items: Array<{ desc: string; cant: number; precio: number }>;
  moneda: string;
} {
  if (!data || typeof data !== "object") {
    throw new Error("Respuesta de IA no es un objeto JSON");
  }

  const d = data as Record<string, unknown>;

  if (!Array.isArray(d.items) || d.items.length === 0) {
    throw new Error("La IA no devolvió items en el presupuesto");
  }

  // Valida cada item
  const items = d.items.map((item: unknown, i: number) => {
    if (!item || typeof item !== "object") throw new Error(`Item ${i} inválido`);
    const it = item as Record<string, unknown>;

    const cant = Number(it.cant);
    const precio = Number(it.precio);

    if (!it.desc || typeof it.desc !== "string") throw new Error(`Item ${i}: desc inválida`);
    if (isNaN(cant) || cant <= 0) throw new Error(`Item ${i}: cant inválida`);
    if (isNaN(precio) || precio < 0) throw new Error(`Item ${i}: precio inválido`);
    // Anti-alucinación extra: si el total parcial supera 50.000€ algo va mal
    if (cant * precio > 50_000) throw new Error(`Item ${i}: total parcial sospechosamente alto`);

    return {
      desc: String(it.desc).slice(0, 500), // limita longitud
      cant: Math.round(cant * 100) / 100, // max 2 decimales
      precio: Math.round(precio * 100) / 100,
    };
  });

  return {
    cliente: typeof d.cliente === "string" ? d.cliente.slice(0, 200) : "Cliente Final",
    items,
    moneda: "EUR",
  };
}
