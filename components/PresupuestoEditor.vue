<script setup lang="ts">
import type { Presupuesto, Calculos } from "~/composable/usePDF";
import type { ConfigEmpresa } from "~/composable/useConfig";

const props = defineProps<{
  presupuesto: Presupuesto;
  configEmpresa: ConfigEmpresa;
  calculos: Calculos;
  formatCurrency: (v: number) => string;
}>();

const emit = defineEmits<{
  "eliminar-fila": [index: number];
  "añadir-fila": [];
  descargar: [];
  compartir: [];
}>();

// Directiva para auto-resize de textarea
const vAutoResize = {
  mounted: (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  },
  updated: (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  },
};
</script>

<template>
  <div
    class="bg-white rounded-[3.5rem] shadow-2xl shadow-slate-200/50 overflow-hidden border border-white animate-in fade-in duration-500">
    <!-- Cabecera del presupuesto -->
    <div class="p-10 border-b border-slate-50 bg-slate-50/50 flex justify-between items-start">
      <div>
        <h4 class="text-2xl font-black italic tracking-tighter text-slate-800">
          {{ configEmpresa.nombre }}
        </h4>
        <p class="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">
          {{ configEmpresa.nif }} | {{ configEmpresa.direccion }}
        </p>
      </div>
      <div class="text-right">
        <div
          class="inline-block bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black uppercase mb-1">
          Borrador Oficial
        </div>
        <p class="text-xs font-bold text-slate-400">#{{ configEmpresa.id }} • {{ configEmpresa.fecha }}</p>
      </div>
    </div>

    <div class="p-10">
      <!-- Campo cliente -->
      <div class="mb-10 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-2">
          Nombre del Cliente
        </label>
        <input
          v-model="presupuesto.cliente"
          class="w-full text-2xl font-black bg-transparent border-none outline-none focus:text-indigo-600 transition-colors" />
      </div>

      <!-- Tabla de ítems -->
      <div class="overflow-x-auto">
        <table class="w-full text-left mb-6">
          <thead>
            <tr
              class="text-[10px] font-black text-slate-300 uppercase tracking-widest border-b border-slate-100">
              <th class="pb-4 pl-2 w-full">Descripción</th>
              <th class="pb-4 text-center w-16">Cant.</th>
              <th class="pb-4 text-right w-24">Precio</th>
              <th class="pb-4 w-8"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr
              v-for="(item, i) in presupuesto.items"
              :key="i"
              class="group hover:bg-slate-50/50 transition-colors">
              <td class="py-5 pl-2 font-bold text-slate-700">
                <textarea
                  v-model="item.desc"
                  rows="1"
                  class="w-full bg-transparent border-none p-0 focus:ring-0 resize-none overflow-hidden text-slate-700 font-bold leading-snug align-top"
                  placeholder="Descripción del trabajo..."
                  @input="
                    (e) => {
                      const el = e.target as HTMLTextAreaElement;
                      el.style.height = 'auto';
                      el.style.height = el.scrollHeight + 'px';
                    }
                  "
                  v-auto-resize></textarea>
              </td>
              <td class="py-5 text-center">
                <input
                  v-model.number="item.cant"
                  type="number"
                  class="w-12 bg-transparent text-center font-bold text-slate-400 outline-none" />
              </td>
              <td class="py-5 text-right font-black text-slate-800">
                <input
                  v-model.number="item.precio"
                  type="number"
                  class="w-24 bg-transparent text-right outline-none focus:text-indigo-600" />
              </td>
              <td class="py-5 text-center">
                <button
                  @click="emit('eliminar-fila', i)"
                  class="text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                  ✕
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Totales y acciones -->
      <div class="flex justify-between items-center mt-6 pt-6 border-t border-slate-100">
        <button
          @click="emit('añadir-fila')"
          class="px-6 py-3 bg-slate-100 rounded-xl text-[11px] font-black text-slate-500 hover:bg-indigo-600 hover:text-white transition-all tracking-widest uppercase">
          + Concepto
        </button>
        <div class="text-right">
          <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest">Total (IVA inc.)</p>
          <p class="text-4xl font-black text-indigo-600 tracking-tighter">
            {{ formatCurrency(calculos.total) }}
          </p>
        </div>
      </div>

      <!-- Botones PDF -->
      <div class="flex flex-col md:flex-row gap-4 mt-12">
        <button
          @click="emit('descargar')"
          class="flex-1 bg-slate-100 text-slate-600 p-6 rounded-3xl font-black text-lg hover:bg-slate-200 transition-all flex items-center justify-center gap-3">
          <span>📥</span> Descargar
        </button>
        <button
          @click="emit('compartir')"
          class="flex-[2] bg-indigo-600 text-white p-6 rounded-3xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
          <span>🚀</span> Generar y Enviar
        </button>
      </div>
    </div>
  </div>
</template>
