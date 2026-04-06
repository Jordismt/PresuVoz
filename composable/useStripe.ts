import { supabase } from "~/lib/supabase";

export const PRICE_ID_UNICO = "price_1THMyXBzDH5mgeinAIX7sJTB";
export const PRICE_ID_PRO = "price_1THS8rBzDH5mgeink9B7w4lQ";

export function useStripe(profile: Ref<any>) {
  const iniciarPago = async (priceId: string, mode: "payment" | "subscription") => {
    if (mode === "subscription" && profile.value?.plan?.toLowerCase() === "pro") {
      alert(
        "Ya tienes activo el Plan PRO. Si necesitas más usos antes de que renueve tu mes, puedes adquirir 'Créditos puntuales'.",
      );
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    try {
      const data = await $fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: { priceId, mode },
      });
      if ((data as any)?.url) window.location.href = (data as any).url;
    } catch (err: any) {
      alert("❌ " + (err.data?.message || "Error al conectar con Stripe"));
    }
  };

  const abrirPortalGestion = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    try {
      const data = await $fetch("/api/stripe/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if ((data as any)?.url) window.location.href = (data as any).url;
    } catch (err: any) {
      alert("❌ " + (err.data?.message || "Error al abrir el portal de gestión"));
    }
  };

  return { iniciarPago, abrirPortalGestion, PRICE_ID_UNICO, PRICE_ID_PRO };
}
