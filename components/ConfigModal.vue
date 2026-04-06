<script setup lang="ts">
import type { ConfigEmpresa } from "~/composable/useConfig";

defineProps<{
  config: ConfigEmpresa;
}>();

const emit = defineEmits<{
  guardar: [];
  cerrar: [];
  "subir-logo": [event: Event];
  "eliminar-logo": [];
}>();
</script>

<template>
  <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
    <div
      class="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl border border-white relative overflow-hidden">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-black text-slate-800 tracking-tight">Datos Fiscales</h3>
        <button @click="emit('cerrar')" class="text-slate-400 hover:text-slate-600 transition-colors">
          ✕
        </button>
      </div>

      <!-- Logo -->
      <div class="flex flex-col items-center justify-center mb-6">
        <div class="relative group">
          <label class="block cursor-pointer">
            <div
              class="w-24 h-24 rounded-[2rem] bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-indigo-300">
              <img v-if="config.logo" :src="config.logo" class="w-full h-full object-cover" />
              <div v-else class="flex flex-col items-center text-slate-400">
                <span class="text-2xl">📷</span>
              </div>
            </div>
            <input type="file" @change="emit('subir-logo', $event)" accept="image/*" class="hidden" />
          </label>

          <div
            v-if="!config.logo"
            class="absolute -bottom-1 -right-1 bg-indigo-600 text-white w-8 h-8 rounded-xl flex items-center justify-center shadow-lg border-2 border-white text-xs pointer-events-none">
            +
          </div>

          <button
            v-else
            @click="emit('eliminar-logo')"
            type="button"
            class="absolute -top-2 -right-2 bg-red-500 text-white w-8 h-8 rounded-xl flex items-center justify-center shadow-lg border-2 border-white hover:bg-red-600 transition-colors"
            title="Quitar logo">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="3"
                d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <span class="text-[10px] text-slate-400 font-black mt-3 uppercase tracking-widest">
          {{ config.logo ? "Click para cambiar logo" : "Subir logo" }}
        </span>
      </div>

      <!-- Campos -->
      <div class="space-y-4">
        <div>
          <label class="text-[10px] font-black text-indigo-500 uppercase ml-3 mb-1 block"
            >Empresa o Autónomo</label
          >
          <input
            v-model="config.nombre"
            placeholder="Nombre comercial"
            class="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-500/20 focus:ring-0 transition-all font-bold text-slate-700" />
        </div>
        <div>
          <label class="text-[10px] font-black text-indigo-500 uppercase ml-3 mb-1 block">NIF / CIF</label>
          <input
            v-model="config.nif"
            placeholder="Documento nacional"
            class="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-500/20 focus:ring-0 transition-all font-bold text-slate-700" />
        </div>
        <div>
          <label class="text-[10px] font-black text-indigo-500 uppercase ml-3 mb-1 block"
            >Dirección Legal</label
          >
          <input
            v-model="config.direccion"
            placeholder="Calle, ciudad, CP"
            class="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-500/20 focus:ring-0 transition-all font-bold text-slate-700" />
        </div>
        <div>
          <label class="text-[10px] font-black text-indigo-500 ml-4 uppercase tracking-widest mb-1 block"
            >Email de Contacto</label
          >
          <input
            v-model="config.email"
            placeholder="tu@email.com"
            class="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-100 focus:ring-0 transition-all font-bold text-slate-700" />
        </div>
      </div>

      <button
        @click="emit('guardar')"
        class="w-full mt-8 bg-indigo-600 text-white p-5 rounded-[1.5rem] font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">
        Actualizar Perfil ✨
      </button>
    </div>
  </div>
</template>
