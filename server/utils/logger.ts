/**
 * Logger centralizado
 *
 * - En desarrollo: console.log con colores
 * - En producción: JSON estructurado (compatible con Vercel Log Drain, Axiom, Datadog)
 *
 * Para conectar Axiom u otro proveedor, añade tu ingesta en la función `ship`.
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  msg: string;
  ts: string;
  env: string;
  [key: string]: unknown;
}

const isDev = process.env.NODE_ENV !== "production";

const COLORS: Record<LogLevel, string> = {
  debug: "\x1b[90m", // gris
  info: "\x1b[36m", // cyan
  warn: "\x1b[33m", // amarillo
  error: "\x1b[31m", // rojo
};
const RESET = "\x1b[0m";

function ship(entry: LogEntry): void {
  if (isDev) {
    const color = COLORS[entry.level];
    const prefix = `${color}[${entry.level.toUpperCase()}]${RESET}`;

    // ✅ Esto soluciona el error del operando 'delete'
    const { level, msg, ts, env, ...meta } = entry;

    const metaStr = Object.keys(meta).length ? " " + JSON.stringify(meta) : "";
    console.log(`${prefix} ${msg}${metaStr}`);
    return;
  }
  process.stdout.write(JSON.stringify(entry) + "\n");
}

function createEntry(level: LogLevel, msg: string, meta?: Record<string, unknown>): LogEntry {
  return {
    level,
    msg,
    ts: new Date().toISOString(),
    env: process.env.NODE_ENV ?? "unknown",
    ...meta,
  };
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => {
    if (isDev) ship(createEntry("debug", msg, meta));
  },
  info: (msg: string, meta?: Record<string, unknown>) => {
    ship(createEntry("info", msg, meta));
  },
  warn: (msg: string, meta?: Record<string, unknown>) => {
    ship(createEntry("warn", msg, meta));
  },
  error: (msg: string, err?: unknown, meta?: Record<string, unknown>) => {
    const errMeta =
      err instanceof Error
        ? { error: err.message, stack: isDev ? err.stack : undefined }
        : { error: String(err) };
    ship(createEntry("error", msg, { ...errMeta, ...meta }));
  },
};
