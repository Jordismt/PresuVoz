import Stripe from "stripe";
import { defineEventHandler, readBody, createError, getHeader } from "h3";
import { createClient } from "@supabase/supabase-js";

export default defineEventHandler(async (event) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const config = useRuntimeConfig(event);

  const { priceId, mode } = await readBody(event);
  const authHeader = getHeader(event, "Authorization");

  if (!authHeader) throw createError({ statusCode: 401, message: "Falta token" });

  const supabase = createClient(config.public.supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) throw createError({ statusCode: 401, message: "Usuario no encontrado" });

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, plan")
      .eq("id", user.id)
      .single();

    // --- NORMALIZACIÓN DE PLAN (Solución al error "pro" vs "PRO") ---
    const planUsuario = profile?.plan?.toUpperCase() || "FREE";

    if (planUsuario === "PRO") {
      if (mode === "subscription") {
        throw createError({
          statusCode: 400,
          statusMessage: "Subscription Blocked",
          message: "Ya tienes una suscripción PRO activa.",
        });
      }
      // Bloqueamos también pagos únicos si ya es PRO para que no tire el dinero
    }

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      line_items: [{ price: priceId, quantity: 1 }],
      mode: mode,
      allow_promotion_codes: true,
      success_url: `${process.env.PUBLIC_BASE_URL || "http://localhost:3000"}/?success=true`,
      cancel_url: `${process.env.PUBLIC_BASE_URL || "http://localhost:3000"}/?canceled=true`,
      ...(mode === "subscription" && {
        subscription_data: {
          metadata: { userId: user.id },
        },
      }),
      metadata: {
        userId: user.id,
        purchaseType: mode,
      },
    };

    if (profile?.stripe_customer_id) {
      sessionConfig.customer = profile.stripe_customer_id;
    } else {
      sessionConfig.customer_email = user.email;
      if (mode === "payment") {
        sessionConfig.customer_creation = "always";
      }
    }

    const checkoutSession = await stripe.checkout.sessions.create(sessionConfig);
    return { url: checkoutSession.url };
  } catch (error: any) {
    // Si es un error que nosotros lanzamos (400), lo dejamos pasar tal cual
    if (error.statusCode === 400) throw error;

    console.error("Error en Stripe:", error.message);
    throw createError({ statusCode: 500, message: error.message });
  }
});
