<script setup lang="ts">
defineProps<{
  profile: any;
  priceIdUnico: string;
  priceIdPro: string;
}>();

const emit = defineEmits<{
  cerrar: [];
  "iniciar-pago": [priceId: string, mode: "payment" | "subscription"];
  "abrir-portal": [];
}>();
</script>

<template>
  <div class="relative z-[9999]">
    <div @click="emit('cerrar')" class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9998]"></div>

    <div
      class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[350px] z-[9999] bg-slate-900 rounded-[3rem] p-8 shadow-2xl border border-slate-800">
      <div class="text-center mb-8">
        <h4 class="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-2">
          Energía PresuVoz
        </h4>
        <p class="text-white text-lg font-bold italic">Recargar Créditos</p>
      </div>

      <div class="space-y-4">
        <!-- Crédito suelto -->
        <button
          @click="
            emit('iniciar-pago', priceIdUnico, 'payment');
            emit('cerrar');
          "
          class="w-full flex justify-between items-center p-6 bg-slate-800/80 rounded-[2rem] border border-slate-700">
          <span class="text-sm font-black text-white italic uppercase">1 Crédito</span>
          <span class="text-xl font-black text-indigo-400">1,59€</span>
        </button>

        <!-- Plan Pro -->
        <button
          v-if="profile?.plan?.toLowerCase() !== 'pro'"
          @click="
            emit('iniciar-pago', priceIdPro, 'subscription');
            emit('cerrar');
          "
          class="group relative w-full overflow-hidden bg-indigo-600 p-5 md:p-6 rounded-[2rem] shadow-xl shadow-indigo-500/30 transition-all hover:scale-[1.01] active:scale-95 border border-indigo-400/30">
          <div
            class="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>

          <div class="relative z-10 flex flex-col gap-4">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div class="flex flex-col text-left">
                <div class="flex items-center gap-2 mb-1">
                  <span
                    class="text-[9px] font-black text-indigo-200 uppercase tracking-[0.2em] bg-white/10 px-2 py-0.5 rounded-full">
                    Recomendado
                  </span>
                </div>
                <h3
                  class="text-xl md:text-2xl font-black text-white italic leading-none uppercase tracking-tighter">
                  Plan Pro <span class="text-indigo-300 ml-1">⚡</span>
                </h3>
              </div>
              <div
                class="flex flex-row md:flex-col items-baseline md:items-end gap-2 md:gap-0 bg-black/10 md:bg-transparent p-3 md:p-0 rounded-2xl">
                <span class="text-2xl md:text-3xl font-black text-white leading-none tracking-tighter"
                  >9,99€</span
                >
                <span class="text-[9px] font-bold text-indigo-200 uppercase tracking-tighter"
                  >/ MES + IVA</span
                >
              </div>
            </div>

            <div class="h-px bg-white/10 w-full"></div>

            <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <div class="bg-white/20 p-2 rounded-xl shrink-0">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="3"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div class="flex flex-col text-left">
                  <span class="text-xs md:text-sm font-black text-white uppercase tracking-wide"
                    >25 Créditos mensuales</span
                  >
                  <span class="text-[10px] text-indigo-200 font-bold uppercase">Uso profesional</span>
                </div>
              </div>
              <div
                class="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-full self-end md:self-center">
                <span class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></span>
                <span class="text-[8px] md:text-[9px] font-black text-white/80 uppercase tracking-widest"
                  >Se renuevan cada mes</span
                >
              </div>
            </div>
          </div>
        </button>
      </div>

      <!-- Portal gestión si es Pro -->
      <div v-if="profile?.plan?.toLowerCase() === 'pro'" class="mt-8 space-y-4">
        <div class="h-px bg-slate-800 w-full"></div>
        <button
          @click="emit('abrir-portal')"
          class="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-[11px] font-black uppercase tracking-[0.15em] text-slate-300">
          <span class="text-lg">⚙️</span> Configurar suscripción
        </button>
      </div>

      <button
        @click="emit('cerrar')"
        class="w-full mt-8 py-2 text-[11px] font-black text-slate-500 uppercase tracking-[0.5em]">
        ✕ CERRAR
      </button>
    </div>
  </div>
</template>
