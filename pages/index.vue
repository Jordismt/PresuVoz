<script setup lang="ts">
import { ref, watch, onMounted, computed } from "vue";
import { supabase } from "~/lib/supabase";
import { useUser } from "~/composable/useUser";
import { useConfig } from "~/composable/useConfig";
import { usePresupuesto } from "~/composable/usePresupuesto";
import { useGrabacion } from "~/composable/useGrabacion";
import { usePDF } from "~/composable/usePDF";
import { useStripe, PRICE_ID_UNICO, PRICE_ID_PRO } from "~/composable/useStripe";

// ── Estado global de UI ────────────────────────────────────────────────────
const { user, loadingUser } = useUser();
const profile = ref<any>(null);
const mostrarLanding = ref(true);
const mostrarRecargaMovil = ref(false);

const modoInvitado = ref(false);

// index.vue
const entrarComoInvitado = () => {
  modoInvitado.value = true;
  mostrarLanding.value = false;

  // Creamos un ejemplo real de un gremio (ej. Electricista)
  presupuesto.value = {
    cliente: "CLIENTE DE PRUEBA",
    items: [
      { 
        desc: "Instalación de cuadro eléctrico según normativa vigente (CGE)", 
        cant: 1, 
        precio: 450 
      },
      { 
        desc: "Punto de luz adicional con canalización de superficie", 
        cant: 4, 
        precio: 65 
      },
      { 
        desc: "Desplazamiento técnico y puesta en marcha", 
        cant: 1, 
        precio: 35 
      }
    ],
    moneda: "EUR"
  };
};

// ── Composables ────────────────────────────────────────────────────────────
const { configEmpresa, verConfig, cargarConfig, guardarConfig, subirLogo, eliminarLogo } = useConfig();

const {
  presupuesto,
  listaPresupuestos,
  idPresupuestoSeleccionado,
  transcripcion,
  cargandoIA,
  calculos,
  cargarHistorial,
  generarConIA,
  seleccionarHistorial,
  eliminarPresupuesto,
  limpiarTodoElHistorial,
  eliminarFila,
  añadirFila,
  limpiarTranscripcion,
} = usePresupuesto(configEmpresa);

const { grabando, textoEnVivo, toggleGrabacion } = useGrabacion(transcripcion);

const { formatCurrency, descargarPDF, compartirPDF } = usePDF();

const { iniciarPago, abrirPortalGestion } = useStripe(profile);

// ── Auth ───────────────────────────────────────────────────────────────────
const fetchProfile = async () => {
  if (!user.value) return;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.value.id).single();
  if (!error) profile.value = data;
};

const logout = async () => {
  // 1. Si hay un usuario real, cerramos sesión en Supabase
  if (user.value) {
    await supabase.auth.signOut();
  }

  // 2. Limpiamos TODOS los estados de la App
  presupuesto.value = null;
  profile.value = null;
  transcripcion.value = ""; // Limpiamos lo que haya escrito

  // 3. Reseteamos los modos de visualización
  modoInvitado.value = false; // <-- Esto es lo que te faltaba
  mostrarLanding.value = true;
};

// ── Lifecycle ──────────────────────────────────────────────────────────────
onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("success")) {
    mostrarLanding.value = false;
    setTimeout(async () => {
      await fetchProfile();
      window.history.replaceState({}, document.title, "/");
    }, 2000);
  }
  cargarConfig();
});

watch(
  user,
  (newUser) => {
    if (newUser) {
      fetchProfile();
      cargarHistorial(newUser.id);
    }
  },
  { immediate: true },
);

// ── Handlers PDF ──────────────────────────────────────────────────────────
const handleDescargar = () => {
  if (presupuesto.value) {
    descargarPDF(presupuesto.value, configEmpresa.value, calculos.value);
  }
};

const handleCompartir = () => {
  if (presupuesto.value) {
    compartirPDF(presupuesto.value, configEmpresa.value, calculos.value);
  }
};

// ── Handler generarConIA con refresco de perfil ───────────────────────────
const handleGenerar = () => {
  generarConIA(async () => {
    await fetchProfile();
  });
};

// ── Lógica de Suscripción y Historial ──────────────────────────────────────

// Definimos si el usuario es PRO basándonos en el profile que ya cargas
const esUsuarioPro = computed(() => profile.value?.plan?.toLowerCase() === "pro");

// Función para manejar el clic en el botón de "Pasar a Pro" del historial
const irAPaginaDePago = () => {
  // Usamos 'iniciarPago' que ya importaste de useStripe
  // Pasamos el ID del plan PRO y el modo 'subscription'
  iniciarPago(PRICE_ID_PRO, "subscription");
};
</script>

<template>
  <div class="min-h-screen bg-[#f1f5f9] text-slate-900 font-sans">
    <!-- Loading spinner -->
    <div v-if="loadingUser" class="fixed inset-0 bg-white z-50 flex items-center justify-center">
      <div class="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <!-- Usuario NO autenticado -->
    <template v-else-if="!user && !modoInvitado">
      <LandingPage
        v-if="mostrarLanding"
        @ir-registro="mostrarLanding = false"
        @ir-login="mostrarLanding = false"
        @probar-invitado="entrarComoInvitado" />

      <AuthForm v-else @volver-landing="mostrarLanding = true" @authenticated="mostrarLanding = false" />
    </template>

    <!-- Usuario autenticado: Dashboard -->
    <div v-else class="max-w-6xl mx-auto p-4 md:p-8 pb-32">
      <AppHeader
        :user="user"
        :profile="profile"
        :mostrarRecargaMovil="mostrarRecargaMovil"
        @update:mostrarRecargaMovil="mostrarRecargaMovil = $event"
        @abrir-config="verConfig = true"
        @logout="logout" />

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Columna izquierda -->
        <div class="lg:col-span-4 space-y-6">
          <InputPanel
            :transcripcion="transcripcion"
            :grabando="grabando"
            :textoEnVivo="textoEnVivo"
            :cargandoIA="cargandoIA"
            :profile="profile"
            :es-invitado="modoInvitado"
            @update:transcripcion="transcripcion = $event"
            @toggle-grabacion="toggleGrabacion"
            @generar="handleGenerar"
            @limpiar="limpiarTranscripcion"
            @necesita-registro="
              modoInvitado = false;
              mostrarLanding = false;
            " />

          <RecargaPanel
            :profile="profile"
            :priceIdUnico="PRICE_ID_UNICO"
            :priceIdPro="PRICE_ID_PRO"
            @iniciar-pago="iniciarPago"
            @abrir-portal="abrirPortalGestion" />
        </div>

        <!-- Columna derecha -->
        <div class="lg:col-span-8">
          <PresupuestoEditor
            v-if="presupuesto"
            :presupuesto="presupuesto"
            :configEmpresa="configEmpresa"
            :calculos="calculos"
            :formatCurrency="formatCurrency"
            @eliminar-fila="eliminarFila"
            @añadir-fila="añadirFila"
            :es-invitado="modoInvitado"
            @necesita-registro="
              modoInvitado = false;
              mostrarLanding = false;
            "
            @descargar="handleDescargar"
            @compartir="handleCompartir" />

          <!-- Placeholder vacío -->
          <div
            v-else
            class="h-[600px] bg-white rounded-[3.5rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center p-12 text-center">
            <div
              class="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-4xl mb-6 grayscale opacity-50">
              📄
            </div>
            <h3 class="text-2xl font-black text-slate-300 tracking-tighter uppercase">
              Esperando instrucciones...
            </h3>
            <p class="max-w-xs text-sm font-medium text-slate-400 mt-3 leading-relaxed">
              Describe los trabajos escribiendo arriba o pulsando el micrófono.
            </p>
          </div>

          <HistorialPresupuestos
            :listaPresupuestos="listaPresupuestos"
            :idPresupuestoSeleccionado="idPresupuestoSeleccionado"
            :formatCurrency="formatCurrency"
            :es-pro="esUsuarioPro"
            @seleccionar="seleccionarHistorial"
            @eliminar="(id) => eliminarPresupuesto(id, user!.id)"
            @limpiarTodo="limpiarTodoElHistorial(user!.id)"
            @irAUpgrade="irAPaginaDePago" />
        </div>
      </div>
    </div>

    <!-- Modales -->
    <ConfigModal
      v-if="verConfig"
      :config="configEmpresa"
      @guardar="guardarConfig"
      @cerrar="verConfig = false"
      @subir-logo="subirLogo"
      @eliminar-logo="eliminarLogo" />

    <RecargaModal
      v-if="mostrarRecargaMovil"
      :profile="profile"
      :priceIdUnico="PRICE_ID_UNICO"
      :priceIdPro="PRICE_ID_PRO"
      @cerrar="mostrarRecargaMovil = false"
      @iniciar-pago="iniciarPago"
      @abrir-portal="abrirPortalGestion" />
  </div>
</template>

<style>
.v-enter-active,
.v-leave-active {
  transition: opacity 0.3s ease;
}
.v-enter-from,
.v-leave-to {
  opacity: 0;
}

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
</style>
