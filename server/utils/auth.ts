/**
 * Utilidad de autenticación compartida para server/api/
 *
 * Centraliza:
 *   1. Extracción y validación del JWT de Supabase
 *   2. Creación del cliente admin (con service role)
 *   3. Tipado del User de Supabase
 *
 * USO en cualquier endpoint:
 *   const { user, supabaseAdmin } = await requireAuth(event)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getHeader, createError, type H3Event } from "h3";
import type { User } from "@supabase/supabase-js";

export interface AuthContext {
  user: User;
  supabaseAdmin: SupabaseClient;
}

// Singleton del cliente admin — se reutiliza entre peticiones en la misma instancia
let _adminClient: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
  if (_adminClient) return _adminClient;

  const url = process.env.NUXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url || !serviceKey) {
    throw new Error("Variables de entorno de Supabase no configuradas");
  }

  _adminClient = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _adminClient;
}

export async function requireAuth(event: H3Event): Promise<AuthContext> {
  const authHeader = getHeader(event, "authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw createError({
      statusCode: 401,
      statusMessage: "Token de autorización requerido",
    });
  }

  const token = authHeader.slice(7); // quita "Bearer "

  if (!token || token.length < 20) {
    throw createError({
      statusCode: 401,
      statusMessage: "Token inválido",
    });
  }

  const supabaseAdmin = getAdminClient();

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Sesión expirada o inválida",
    });
  }

  return { user, supabaseAdmin };
}
