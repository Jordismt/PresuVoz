import { ref, computed } from "vue";
import { supabase } from "~/lib/supabase";
import type { Item, Presupuesto } from "./usePDF";
import type { ConfigEmpresa } from "./useConfig";

export function usePresupuesto(configEmpresa: Ref<ConfigEmpresa>) {
  const presupuesto = ref<Presupuesto | null>(null);
  const listaPresupuestos = ref<any[]>([]);
  const idPresupuestoSeleccionado = ref<string | null>(null);
  const transcripcion = ref("");
  const cargandoIA = ref(false);

  const calculos = computed(() => {
    if (!presupuesto.value) return { subtotal: 0, iva: 0, total: 0 };
    const subtotal = presupuesto.value.items.reduce((acc, i) => acc + i.cant * i.precio, 0);
    const iva = subtotal * (configEmpresa.value.ivaPorcentaje / 100);
    return { subtotal, iva, total: subtotal + iva };
  });

  const cargarHistorial = async (userId: string) => {
    const { data, error } = await supabase
      .from("presupuestos")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando historial:", error.message);
      return;
    }
    listaPresupuestos.value = data || [];
  };

  const generarConIA = async (onSuccess?: () => void) => {
    if (!transcripcion.value) return;
    cargandoIA.value = true;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/generar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ texto: transcripcion.value }),
      });
      if (!res.ok) throw new Error((await res.json()).statusMessage || "Error");
      presupuesto.value = await res.json();
      idPresupuestoSeleccionado.value = null;
      await guardarEnDB(session?.user?.id);
      onSuccess?.();
    } catch (e: any) {
      alert("❌ " + e.message);
    } finally {
      cargandoIA.value = false;
    }
  };

  const guardarEnDB = async (userId?: string) => {
    if (!presupuesto.value || !userId) return;

    const datosAGuardar: any = {
      user_id: userId,
      cliente: presupuesto.value.cliente,
      items: presupuesto.value.items,
      total: calculos.value.total,
    };

    if (idPresupuestoSeleccionado.value) {
      datosAGuardar.id = idPresupuestoSeleccionado.value;
    }

    const { data, error } = await supabase
      .from("presupuestos")
      .upsert(datosAGuardar, { onConflict: "id" })
      .select();

    if (error) {
      console.error("Error al guardar:", error.message);
    } else if (data && data[0]) {
      idPresupuestoSeleccionado.value = data[0].id;
    }

    await cargarHistorial(userId);
  };

  const seleccionarHistorial = (p: any) => {
    idPresupuestoSeleccionado.value = p.id;
    presupuesto.value = { cliente: p.cliente, items: p.items };
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const eliminarPresupuesto = async (id: string, userId: string) => {
    if (!confirm("¿Seguro que quieres borrar este presupuesto?")) return;

    const { error } = await supabase.from("presupuestos").delete().eq("id", id);

    if (error) {
      alert("Error al eliminar: " + error.message);
    } else {
      if (idPresupuestoSeleccionado.value === id) {
        presupuesto.value = null;
        idPresupuestoSeleccionado.value = null;
      }
      await cargarHistorial(userId);
    }
  };

  const limpiarTodoElHistorial = async (userId: string) => {
    if (!confirm("⚠️ ¿Estás seguro? Se borrarán TODOS tus presupuestos guardados de forma permanente."))
      return;

    const { error } = await supabase.from("presupuestos").delete().eq("user_id", userId);

    if (error) {
      alert("Error: " + error.message);
    } else {
      presupuesto.value = null;
      idPresupuestoSeleccionado.value = null;
      await cargarHistorial(userId);
    }
  };

  const eliminarFila = (i: number) => presupuesto.value?.items.splice(i, 1);

  const añadirFila = () => presupuesto.value?.items.push({ desc: "Nuevo concepto", cant: 1, precio: 0 });

  const limpiarTranscripcion = () => {
    transcripcion.value = "";
  };

  return {
    presupuesto,
    listaPresupuestos,
    idPresupuestoSeleccionado,
    transcripcion,
    cargandoIA,
    calculos,
    cargarHistorial,
    generarConIA,
    guardarEnDB,
    seleccionarHistorial,
    eliminarPresupuesto,
    limpiarTodoElHistorial,
    eliminarFila,
    añadirFila,
    limpiarTranscripcion,
  };
}
