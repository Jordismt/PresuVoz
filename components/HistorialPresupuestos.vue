<script setup lang="ts">
defineProps<{
  listaPresupuestos: any[];
  idPresupuestoSeleccionado: string | null;
  formatCurrency: (v: number) => string;
  // Nueva prop para controlar el acceso
  esPro: boolean;
}>();

const emit = defineEmits<{
  seleccionar: [presupuesto: any];
  eliminar: [id: string];
  limpiarTodo: [];
  // Evento opcional para llevar al usuario a la suscripción
  irAUpgrade: [];
}>();
</script>

<template>
  <div v-if="listaPresupuestos.length" class="mt-20 relative">
    <div class="relative min-h-[350px]">
      <div
        :class="[!esPro ? 'blur-md grayscale opacity-40 pointer-events-none select-none' : '']"
        class="grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-700">
        <div v-for="p in listaPresupuestos" :key="p.id" class="relative group">
          <div
            @click="emit('seleccionar', p)"
            :class="
              idPresupuestoSeleccionado === p.id
                ? 'border-indigo-500 ring-4 ring-indigo-50'
                : 'border-white hover:border-indigo-200'
            "
            class="bg-white p-6 rounded-[2rem] shadow-sm border-2 cursor-pointer transition-all hover:shadow-md relative overflow-hidden"></div>
        </div>
      </div>

      <div v-if="!esPro" class="absolute inset-0 z-20 flex items-center justify-center -top-4" @click.stop>
        <div class="absolute inset-0 bg-slate-50/40 backdrop-blur-[4px] rounded-[3rem]"></div>

        <div
          class="relative bg-white p-8 rounded-[3rem] shadow-[0_30px_100px_-20px_rgba(79,70,229,0.2)] border border-slate-100 max-w-[320px] w-full text-center"
          @click.stop>
          <div
            class="absolute -top-7 left-1/2 -translate-x-1/2 w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-xl shadow-indigo-200 rotate-6 border-4 border-white">
            💎
          </div>

          <div class="pt-4">
            <h4 class="text-xl font-black text-slate-900 italic uppercase tracking-tighter">
              Historial <span class="text-indigo-600">Pro</span>
            </h4>
            <p class="mt-3 text-slate-500 text-[13px] font-medium leading-tight">
              ¿Quieres recuperar tus trabajos anteriores? Pásate a Pro y olvida el papel para siempre.
            </p>

            <button
              @click.stop="emit('irAUpgrade')"
              class="mt-8 w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100">
              Activar ahora por 9,99€
            </button>

            <p class="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">
              Suscripción mensual • Cancela cuando quieras
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
