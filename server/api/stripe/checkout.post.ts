/**
 * POST /api/stripe/checkout
 *
 * Crea una sesión de Stripe Checkout.
 *
 * Mejoras de seguridad aplicadas:
 *  - Validación de priceId contra lista blanca de .env (CRÍTICO)
 *  - Validación del mode ("subscription" | "payment")
 *  - Autenticación centralizada
 *  - No expone mensajes de error de Stripe al cliente
 *  - Normalización del plan antes de comparar
 */

import Stripe from "stripe";
import { defineEventHandler, readBody, createError } from "h3";
import { requireAuth } from "../../utils/auth";
import { validateStripeCheckoutBody } from "../../utils/validators";
import { logger } from "../../utils/logger";

export default defineEventHandler(async (event) => {
  // 1. Autenticación centralizada
  const { user, supabaseAdmin } = await requireAuth(event);

  // 2. Leer y validar el body — valida priceId contra lista blanca
  const body = await readBody(event);
  const { priceId, mode } = validateStripeCheckoutBody(body);

  // 3. Init Stripe
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    logger.error("STRIPE_SECRET_KEY no configurada");
    throw createError({ statusCode: 500, statusMessage: "Error de configuración del servidor" });
  }
  const stripe = new Stripe(stripeKey);

  // 4. Obtener perfil del usuario
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id, plan")
    .eq("id", user.id)
    .single();

  if (profileError) {
    logger.error("Error obteniendo perfil para checkout", profileError, { userId: user.id });
    throw createError({ statusCode: 500, statusMessage: "Error interno. Inténtalo de nuevo." });
  }

  // 5. Bloquear suscripciones duplicadas
  const planUsuario = profile?.plan?.toUpperCase() ?? "FREE";

  if (planUsuario === "PRO" && mode === "subscription") {
    throw createError({
      statusCode: 400,
      statusMessage: "Ya tienes una suscripción PRO activa.",
    });
  }

  // 6. Construir la sesión de Checkout
  const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";

  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    line_items: [{ price: priceId, quantity: 1 }],
    mode: mode as Stripe.Checkout.SessionCreateParams["mode"],
    allow_promotion_codes: true,
    success_url: `${baseUrl}/?success=true`,
    cancel_url: `${baseUrl}/?canceled=true`,
    // Importante: el userId en metadata del checkout Y en subscription_data
    // para que el webhook lo encuentre en ambos tipos de evento
    metadata: {
      userId: user.id,
      purchaseType: mode,
    },
    ...(mode === "subscription" && {
      subscription_data: {
        metadata: { userId: user.id },
      },
    }),
  };

  // Asocia al customer de Stripe si ya existe para pre-rellenar datos
  if (profile?.stripe_customer_id) {
    sessionConfig.customer = profile.stripe_customer_id;
  } else {
    sessionConfig.customer_email = user.email;
    if (mode === "payment") {
      sessionConfig.customer_creation = "always";
    }
  }

  // 7. Crear la sesión
  try {
    const session = await stripe.checkout.sessions.create(sessionConfig);

    logger.info("Checkout session creada", {
      userId: user.id,
      mode,
      sessionId: session.id,
    });

    return { url: session.url };
  } catch (err: unknown) {
    // No exponemos el mensaje de Stripe al cliente
    logger.error("Error creando Stripe checkout session", err, { userId: user.id, mode });
    throw createError({
      statusCode: 500,
      statusMessage: "Error al procesar el pago. Inténtalo de nuevo.",
    });
  }
});