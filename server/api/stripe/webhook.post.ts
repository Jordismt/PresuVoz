/**
 * POST /api/stripe/webhook
 *
 * Procesa eventos de Stripe de forma segura e idempotente.
 *
 * Mejoras aplicadas:
 *  - Idempotencia: guarda event IDs procesados para evitar doble-crédito
 *  - Manejo de errores granular por tipo de evento
 *  - Logger estructurado en lugar de console.log
 *  - Funciones auxiliares tipadas y documentadas
 *  - Separación clara de responsabilidades
 */

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { defineEventHandler, readRawBody, getHeader, createError } from "h3";
import { logger } from "../../utils/logger";

// ── Cliente admin de Supabase (singleton) ────────────────────────────────────

function getAdminClient() {
  return createClient(
    process.env.NUXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// ── Handler principal ────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    logger.error("Variables de Stripe no configuradas en webhook");
    throw createError({ statusCode: 500, statusMessage: "Error de configuración" });
  }

  const stripe = new Stripe(stripeKey);
  const signature = getHeader(event, "stripe-signature");
  const rawBody = await readRawBody(event);

  if (!signature || !rawBody) {
    throw createError({ statusCode: 400, statusMessage: "Faltan datos del webhook" });
  }

  // 1. Verificar firma criptográfica de Stripe (CRÍTICO — no saltarse nunca)
  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    logger.warn("Firma de webhook inválida — posible petición falsificada", { err });
    throw createError({ statusCode: 400, statusMessage: "Firma inválida" });
  }

  const supabaseAdmin = getAdminClient();

  // 2. Idempotencia: evita procesar el mismo evento dos veces
  //    (Stripe reintenta el webhook si no recibe un 200 a tiempo)
  const alreadyProcessed = await checkIdempotency(supabaseAdmin, stripeEvent.id);
  if (alreadyProcessed) {
    logger.info("Webhook duplicado ignorado", { eventId: stripeEvent.id, type: stripeEvent.type });
    return { received: true, duplicate: true };
  }

  // 3. Procesar según el tipo de evento
  try {
    switch (stripeEvent.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(supabaseAdmin, stripeEvent.data.object as Stripe.Checkout.Session);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(supabaseAdmin, stripeEvent.data.object as Stripe.Invoice);
        break;

      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionChange(supabaseAdmin, stripeEvent.data.object as Stripe.Subscription);
        break;

      default:
        // Eventos que no gestionamos — respondemos 200 para que Stripe no reintente
        logger.debug("Evento de Stripe no gestionado", { type: stripeEvent.type });
    }

    // 4. Marcar como procesado DESPUÉS de que todo haya ido bien
    await markAsProcessed(supabaseAdmin, stripeEvent.id, stripeEvent.type);
  } catch (err) {
    logger.error("Error procesando evento de Stripe", err, {
      eventId: stripeEvent.id,
      type: stripeEvent.type,
    });
    // Devolvemos 500 para que Stripe reintente el webhook
    throw createError({ statusCode: 500, statusMessage: "Error procesando evento" });
  }

  return { received: true };
});

// ── Idempotencia ─────────────────────────────────────────────────────────────

async function checkIdempotency(
  supabase: ReturnType<typeof getAdminClient>,
  eventId: string,
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("stripe_processed_events")
      .select("id")
      .eq("stripe_event_id", eventId)
      .maybeSingle();
    return data !== null;
  } catch {
    // Si la tabla no existe aún, no bloqueamos el procesamiento
    logger.warn("Tabla stripe_processed_events no encontrada — crea la migración SQL");
    return false;
  }
}

async function markAsProcessed(
  supabase: ReturnType<typeof getAdminClient>,
  eventId: string,
  eventType: string,
): Promise<void> {
  try {
    await supabase
      .from("stripe_processed_events")
      .insert({ stripe_event_id: eventId, event_type: eventType });
  } catch (err) {
    // No bloqueamos si falla — el log nos alertará
    logger.error("No se pudo guardar el evento procesado", err, { eventId });
  }
}

// ── Handlers de eventos ──────────────────────────────────────────────────────

async function handleCheckoutCompleted(
  supabase: ReturnType<typeof getAdminClient>,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = session.metadata?.userId;
  const customerId = session.customer as string;

  if (!userId) {
    logger.warn("checkout.session.completed sin userId en metadata", { sessionId: session.id });
    return;
  }

  if (session.mode === "subscription") {
    await activateProPlan(supabase, userId, customerId);
    logger.info("Plan PRO activado por checkout", { userId, sessionId: session.id });
  } else if (session.mode === "payment") {
    await addSingleCredit(supabase, userId);
    logger.info("Crédito único añadido", { userId, sessionId: session.id });
  }
}

async function handleInvoicePaymentSucceeded(
  supabase: ReturnType<typeof getAdminClient>,
  invoice: Stripe.Invoice,
): Promise<void> {
  // Solo procesamos la renovación automática mensual, no el primer pago
  // (el primer pago ya lo gestiona checkout.session.completed)
  if (invoice.billing_reason !== "subscription_cycle") return;

  const customerId = invoice.customer as string;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (error || !profile) {
    logger.warn("invoice.payment_succeeded: usuario no encontrado por customerId", { customerId });
    return;
  }

  await activateProPlan(supabase, profile.id, customerId);
  logger.info("Renovación PRO procesada", { userId: profile.id, customerId });
}

async function handleSubscriptionChange(
  supabase: ReturnType<typeof getAdminClient>,
  subscription: Stripe.Subscription,
): Promise<void> {
  const customerId = subscription.customer as string;
  const isCancelling =
    subscription.cancel_at_period_end || subscription.status === "canceled";

  if (!isCancelling) return;

  const { error } = await supabase
    .from("profiles")
    .update({
      plan: "free",
      subscription_status: "canceled",
    })
    .eq("stripe_customer_id", customerId);

  if (error) {
    logger.error("Error actualizando plan tras cancelación", error, { customerId });
    throw error;
  }

  logger.info("Suscripción cancelada — plan degradado a free", {
    customerId,
    status: subscription.status,
  });
}

// ── Funciones de actualización de perfil ─────────────────────────────────────

async function activateProPlan(
  supabase: ReturnType<typeof getAdminClient>,
  userId: string,
  customerId: string,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      plan: "pro",
      requests_limit: 25,
      requests_used: 0,
      stripe_customer_id: customerId,
      subscription_status: "active",
    })
    .eq("id", userId);

  if (error) {
    logger.error("Error activando plan PRO", error, { userId });
    throw error;
  }
}

async function addSingleCredit(
  supabase: ReturnType<typeof getAdminClient>,
  userId: string,
): Promise<void> {
  // Usa el RPC para sumar de forma atómica (evita race condition)
  const { error } = await supabase.rpc("sumar_credito_usuario", { user_id_param: userId });

  if (error) {
    // Fallback: UPDATE manual si el RPC no existe aún
    logger.warn("RPC sumar_credito_usuario no encontrado, usando UPDATE directo", { userId });
    const { data: profile } = await supabase
      .from("profiles")
      .select("requests_limit")
      .eq("id", userId)
      .single();

    const nuevoLimite = (profile?.requests_limit ?? 0) + 1;
    await supabase.from("profiles").update({ requests_limit: nuevoLimite }).eq("id", userId);
  }
}