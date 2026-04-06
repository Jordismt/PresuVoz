<script setup lang="ts">
import { ref, computed } from "vue";

const props = defineProps<{
  listaPresupuestos: any[];
  idPresupuestoSeleccionado: string | null;
  formatCurrency: (v: number) => string;
  esPro: boolean;
}>();

const emit = defineEmits<{
  seleccionar: [presupuesto: any];
  eliminar: [id: string];
  limpiarTodo: [];
  irAUpgrade: [];
}>();

// --- ESTADO LOCAL ---
const busqueda = ref("");
const filtroFecha = ref<"todos" | "hoy" | "mes">("todos");

// --- LÓGICA DE FILTRADO ---
const presupuestosFiltrados = computed(() => {
  let lista = props.listaPresupuestos;

  // Filtro por búsqueda
  if (busqueda.value.trim()) {
    const query = busqueda.value.toLowerCase();
    lista = lista.filter((p) => p.cliente?.toLowerCase().includes(query));
  }

  // Filtro por fecha
  const ahora = new Date();
  if (filtroFecha.value === "hoy") {
    lista = lista.filter((p) => new Date(p.created_at).toDateString() === ahora.toDateString());
  } else if (filtroFecha.value === "mes") {
    lista = lista.filter((p) => {
      const fechaP = new Date(p.created_at);
      return fechaP.getMonth() === ahora.getMonth() && fechaP.getFullYear() === ahora.getFullYear();
    });
  }

  return lista;
});
</script>

<template>
  <div v-if="listaPresupuestos.length" class="mt-20 relative">
    <div class="mb-8 space-y-6">
      <div class="flex items-center gap-3">
        <h3 class="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Historial de Actividad</h3>
        <div class="h-[1px] bg-slate-200 flex-1"></div>
      </div>

      <div class="flex flex-col md:flex-row gap-4">
        <div class="relative flex-1">
          <span class="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            v-model="busqueda"
            type="text"
            placeholder="Buscar por cliente..."
            class="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-indigo-500 outline-none transition-all shadow-sm" />
        </div>

        <div class="flex bg-slate-200/50 p-1 rounded-2xl">
          <button
            v-for="f in ['todos', 'hoy', 'mes'] as const"
            :key="f"
            @click="filtroFecha = f"
            :class="[
              filtroFecha === f
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            ]"
            class="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
            {{ f }}
          </button>
        </div>

        <button
          v-if="esPro"
          @click="emit('limpiarTodo')"
          class="px-4 py-2 text-[10px] font-black text-red-400 hover:bg-red-50 rounded-xl uppercase tracking-widest transition-all">
          Borrar todo
        </button>
      </div>
    </div>

    <div class="relative min-h-[400px]">
      <div
        :class="[!esPro ? 'blur-xl grayscale opacity-30 pointer-events-none select-none' : '']"
        class="grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-1000">
        <div v-for="p in presupuestosFiltrados" :key="p.id" class="relative group">
          <div
            @click="emit('seleccionar', p)"
            :class="
              idPresupuestoSeleccionado === p.id
                ? 'border-indigo-500 ring-4 ring-indigo-50 bg-indigo-50/10'
                : 'border-white hover:border-indigo-100 bg-white'
            "
            class="p-6 rounded-[2.5rem] shadow-sm border-2 cursor-pointer transition-all hover:shadow-xl relative overflow-hidden">
            <div class="flex justify-between items-start mb-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  👤
                </div>
                <div>
                  <p class="font-black text-slate-800 group-hover:text-indigo-600 truncate max-w-[150px]">
                    {{ p.cliente || "Cliente sin nombre" }}
                  </p>
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                    {{ new Date(p.created_at).toLocaleDateString() }}
                  </p>
                </div>
              </div>
            </div>

            <div class="flex justify-between items-end">
              <div>
                <p class="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Total</p>
                <p class="text-2xl font-black text-slate-900 leading-none tracking-tighter">
                  {{ formatCurrency(p.total) }}
                </p>
              </div>
              <div
                class="flex items-center gap-1 text-indigo-500 font-black text-[10px] uppercase opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                Abrir <span>→</span>
              </div>
            </div>
          </div>

          <button
            v-if="esPro"
            @click.stop="emit('eliminar', p.id)"
            class="absolute -top-2 -right-2 w-10 h-10 flex items-center justify-center rounded-full bg-white border shadow-md text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white z-10">
            ✕
          </button>
        </div>

        <div v-if="presupuestosFiltrados.length === 0" class="col-span-full py-20 text-center">
          <p class="text-slate-400 font-bold italic">No se han encontrado presupuestos...</p>
        </div>
      </div>

      <div v-if="!esPro" class="absolute inset-0 z-30 flex items-center justify-center -top-10" @click.stop>
        <div class="absolute inset-0 bg-slate-50/20 backdrop-blur-[6px] rounded-[3.5rem]"></div>

        <div
          class="relative bg-white p-10 rounded-[3.5rem] shadow-[0_40px_120px_-20px_rgba(79,70,229,0.3)] border border-indigo-50 max-w-[340px] w-full text-center"
          @click.stop>
          <div
            class="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-[1.5rem] flex items-center justify-center text-white text-3xl shadow-xl rotate-6 border-4 border-white">
            💎
          </div>

          <div class="mt-4">
            <h4 class="text-2xl font-black text-slate-900 italic uppercase tracking-tighter">
              Versión <span class="text-indigo-600">Pro</span>
            </h4>
            <p class="mt-4 text-slate-500 text-sm font-medium leading-relaxed">
              Organiza, filtra y recupera todos tus presupuestos grabados. Libera el poder de tu historial.
            </p>

            <button
              @click.stop="emit('irAUpgrade')"
              class="mt-8 w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all active:scale-95 shadow-2xl">
              ¡Quiero ser Pro!
            </button>

            <p class="mt-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] opacity-60">
              Desbloqueo instantáneo
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
