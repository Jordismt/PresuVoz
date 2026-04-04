import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { defineEventHandler, readRawBody, getHeader, createError } from "h3";

export default defineEventHandler(async (event) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const signature = getHeader(event, "stripe-signature");
  const body = await readRawBody(event);

  if (!signature || !body) throw createError({ statusCode: 400, statusMessage: "Faltan datos" });

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    throw createError({ statusCode: 400, statusMessage: "Firma inválida" });
  }

  const supabaseAdmin = createClient(
    process.env.NUXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // --- LÓGICA DE ACTUALIZACIÓN ---

  // Función para PAGOS ÚNICOS (Sumar 1 crédito)
  const sumarUnCredito = async (userId: string) => {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("requests_limit")
      .eq("id", userId)
      .single();
    const nuevoLimite = (profile?.requests_limit || 0) + 1;
    await supabaseAdmin.from("profiles").update({ requests_limit: nuevoLimite }).eq("id", userId);
  };

  // Función para SUSCRIPCIÓN PRO (Resetear a 100 y limpiar uso)
  // Función para SUSCRIPCIÓN PRO (Suma 25 créditos cada vez)
  const resetearPlanPro = async (userId: string, customerId: string) => {
    // 1. Miramos qué límite tiene ahora mismo el usuario
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("requests_limit")
      .eq("id", userId)
      .single();

    // 2. Sumamos 25 al límite actual (si no tiene nada, usamos 0)

    const nuevoLimite = 25;

    // 3. Actualizamos: el plan pasa a ser 'pro', subimos el límite y NO tocamos el uso
    await supabaseAdmin
      .from("profiles")
      .update({
        plan: "pro",
        requests_limit: nuevoLimite,
        requests_used: 0,
        stripe_customer_id: customerId,
        subscription_status: "active",
      })
      .eq("id", userId);

    console.log(`✅ Créditos sumados. Nuevo límite para ${userId}: ${nuevoLimite}`);
  };

  // --- PROCESAR EVENTOS ---

  // CASO 1: Primer pago (Checkout)
  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object as any;
    const userId = session.metadata?.userId;
    const customerId = session.customer;

    if (userId) {
      if (session.mode === "subscription") {
        await resetearPlanPro(userId, customerId);
        console.log(`🚀 Plan PRO activado para: ${userId}`);
      } else {
        await sumarUnCredito(userId);
        console.log(`💰 Crédito suelto sumado a: ${userId}`);
      }
    }
  }

  // CASO 2: Renovación automática (Mes 2, 3...)
  if (stripeEvent.type === "invoice.payment_succeeded") {
    const invoice = stripeEvent.data.object as any;
    const customerId = invoice.customer;

    // Buscamos al usuario por su ID de Stripe
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();

    // billing_reason === 'subscription_cycle' significa que es la renovación mensual automática
    if (profile && invoice.billing_reason === "subscription_cycle") {
      await resetearPlanPro(profile.id, customerId);
      console.log(`🔄 Renovación mensual procesada para: ${profile.id}`);
    }
  }

  // --- DENTRO DE TU EVENT HANDLER ---

  // CASO 4: Cancelación inmediata o programada
  if (
    stripeEvent.type === "customer.subscription.updated" ||
    stripeEvent.type === "customer.subscription.deleted"
  ) {
    const subscription = stripeEvent.data.object as any;
    const customerId = subscription.customer;

    // cancel_at_period_end es true si el usuario ha dado a "cancelar" en el portal
    // status === 'canceled' es si la suscripción ya ha muerto
    const isCancelling = subscription.cancel_at_period_end || subscription.status === "canceled";

    if (isCancelling) {
      await supabaseAdmin
        .from("profiles")
        .update({
          plan: "free",
          subscription_status: "canceled",
          // NOTA: Yo no le quitaría los créditos de golpe si ya los pagó,
          // pero al poner plan: 'free' ya no le saldrá el check verde de PRO.
        })
        .eq("stripe_customer_id", customerId);

      console.log(`⚠️ Suscripción marcada para cancelar o borrada para el cliente: ${customerId}`);
    }
  }

  return { received: true };
});
