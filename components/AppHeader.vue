<script setup lang="ts">
defineProps<{
  user: any;
  profile: any;
  mostrarRecargaMovil: boolean;
}>();

const emit = defineEmits<{
  "update:mostrarRecargaMovil": [value: boolean];
  "abrir-config": [];
  logout: [];
}>();
</script>

<template>
  <header
    class="flex flex-col md:flex-row justify-between items-center gap-6 mb-12 bg-white/50 backdrop-blur-md p-6 rounded-[2.5rem] border border-white shadow-sm relative">
    <!-- Logo + saludo -->
    <div class="flex items-center gap-4 w-full md:w-auto">
      <div class="relative shrink-0 transform -rotate-3 transition-transform hover:rotate-0 duration-300">
        <div class="absolute inset-0 bg-indigo-200 rounded-2xl blur-lg opacity-40 scale-90"></div>
        <img
          src="/logo.png"
          alt="Logo PresuVoz"
          class="relative w-12 h-12 object-contain bg-white rounded-2xl p-1.5 shadow-lg border border-slate-100" />
      </div>
      <div class="flex flex-col">
        <div class="flex items-center gap-2">
          <span
            class="text-[10px] font-black text-indigo-500 uppercase tracking-[0.15em] bg-indigo-50 px-2 py-0.5 rounded-md">
            {{ profile?.plan || "Free" }}
          </span>
          <span class="text-sm font-bold text-slate-500 capitalize italic">
            ¡Hola, {{ user?.email?.split("@")[0] }}! 👋
          </span>
        </div>
        <h2 class="text-2xl font-black tracking-tighter uppercase italic leading-none mt-1">
          Presu<span class="text-indigo-600">Voz</span>
        </h2>
      </div>
    </div>

    <span class="text-[13px] font-black text-slate-400 uppercase tracking-widest">• 1 Crédito / Uso</span>

    <!-- Acciones -->
    <div
      class="flex flex-wrap items-center justify-between md:justify-end gap-3 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
      <!-- Créditos disponibles -->
      <div v-if="profile" class="relative">
        <button
          @click="emit('update:mostrarRecargaMovil', !mostrarRecargaMovil)"
          class="relative z-30 flex items-center bg-slate-900 text-white rounded-2xl shadow-xl hover:shadow-indigo-500/10 active:scale-95 transition-all overflow-hidden border border-slate-800">
          <div class="flex items-center gap-2 px-4 py-2.5 bg-slate-800/50 border-r border-slate-700/50">
            <div class="relative flex h-2 w-2">
              <span
                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </div>
            <p class="text-[11px] font-black uppercase tracking-widest leading-none">
              {{ profile.requests_limit - profile.requests_used }}
              <span class="text-slate-500 ml-1">Disponibles</span>
            </p>
          </div>
          <div class="px-4 py-2.5 flex items-center gap-2 transition-colors">
            <p class="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-400">
              {{ profile?.plan?.toLowerCase() === "pro" ? "Gestionar" : "Más Créditos" }}
            </p>
            <span class="text-[10px]">{{ mostrarRecargaMovil ? "▲" : "▼" }}</span>
          </div>
        </button>
      </div>

      <div class="flex gap-2">
        <button
          @click="emit('abrir-config')"
          class="flex items-center gap-2 px-4 h-11 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-400 transition-all group active:scale-95">
          <svg
            class="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span class="text-[11px] font-black uppercase tracking-widest text-slate-600">Perfil</span>
        </button>

        <button
          @click="emit('logout')"
          class="px-5 h-11 bg-red-50 rounded-xl border border-red-100 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-95">
          Salir
        </button>
      </div>
    </div>
  </header>
</template>
