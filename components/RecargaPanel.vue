<script setup lang="ts">
const props = defineProps<{
  profile: any;
  priceIdUnico: string;
  priceIdPro: string;
}>();

const emit = defineEmits<{
  "iniciar-pago": [priceId: string, mode: "payment" | "subscription"];
  "abrir-portal": [];
}>();
</script>

<template>
  <div class="hidden lg:block">
    <div
      class="relative overflow-hidden bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl border border-slate-800">
      <div
        class="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 blur-[80px] rounded-full pointer-events-none"></div>

      <div class="relative z-10">
        <div class="flex items-center justify-between mb-8">
          <div>
            <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">Tu Energía</h4>
            <p class="text-2xl font-black italic tracking-tighter">
              Recargar <span class="text-indigo-500">Créditos</span>
            </p>
          </div>
          <div
            class="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
            <span class="text-2xl">⚡</span>
          </div>
        </div>

        <div class="space-y-4">
          <!-- Crédito suelto -->
          <button
            @click="emit('iniciar-pago', priceIdUnico, 'payment')"
            class="w-full group relative flex justify-between items-center p-6 bg-slate-800/40 rounded-3xl hover:bg-slate-800/80 transition-all border border-slate-700/50 hover:border-slate-600 shadow-sm overflow-hidden">
            <div class="text-left relative z-10">
              <span class="font-bold text-slate-100 block text-lg">Crédito Suelto</span>
              <span class="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1 block">
                Para un presupuesto rápido
              </span>
            </div>
            <div class="flex flex-col items-end relative z-10">
              <span class="text-xl font-black text-white italic">1,59€</span>
              <span class="text-[9px] text-indigo-400 font-bold uppercase tracking-tighter"
                >Sin compromiso</span
              >
            </div>
          </button>

          <!-- Plan Pro -->
          <button
            @click="emit('iniciar-pago', priceIdPro, 'subscription')"
            :disabled="profile?.plan?.toLowerCase() === 'pro'"
            class="w-full relative flex justify-between items-center p-6 rounded-[2rem] transition-all duration-500 overflow-hidden border"
            :class="
              profile?.plan?.toLowerCase() === 'pro'
                ? 'bg-slate-900/50 border-slate-800 cursor-default opacity-80'
                : 'bg-slate-900 border-indigo-500/30 hover:border-indigo-400 shadow-[0_0_40px_-10px_rgba(79,70,229,0.3)] hover:shadow-[0_0_50px_-5px_rgba(79,70,229,0.5)] group active:scale-[0.97]'
            ">
            <div
              v-if="profile?.plan?.toLowerCase() !== 'pro'"
              class="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0%,transparent_70%,#6366f1_100%)] opacity-20 group-hover:opacity-40 animate-[spin_4s_linear_infinite]"></div>
            <div class="absolute inset-[2px] bg-slate-900/90 rounded-[1.9rem] z-0"></div>

            <div class="text-left relative z-10">
              <div class="flex flex-col">
                <div class="flex items-center gap-2">
                  <span
                    class="font-black text-xl tracking-tighter"
                    :class="
                      profile?.plan?.toLowerCase() === 'pro'
                        ? 'text-slate-500'
                        : 'text-white group-hover:text-indigo-300 transition-colors'
                    ">
                    {{ profile?.plan?.toLowerCase() === "pro" ? "SUSCRIPCIÓN ACTIVA" : "PLAN PRO" }}
                  </span>
                  <div
                    v-if="profile?.plan?.toLowerCase() !== 'pro'"
                    class="bg-indigo-600 text-white text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter animate-pulse">
                    TOP VENTAS
                  </div>
                </div>
                <div class="flex flex-col gap-1 mt-2">
                  <div
                    class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest"
                    :class="profile?.plan?.toLowerCase() === 'pro' ? 'text-slate-600' : 'text-indigo-400/80'">
                    <span class="text-xs">⚡</span>
                    {{
                      profile?.plan?.toLowerCase() === "pro"
                        ? "Uso ilimitado habilitado"
                        : "25 presupuestos / mes"
                    }}
                  </div>
                  <div
                    v-if="profile?.plan?.toLowerCase() !== 'pro'"
                    class="flex items-center gap-1.5 text-[9px] text-slate-400 font-medium">
                    <span class="text-emerald-500">✓</span> Sin marcas de agua
                  </div>
                </div>
              </div>
            </div>

            <div class="text-right relative z-10">
              <div v-if="profile?.plan?.toLowerCase() !== 'pro'" class="flex flex-col">
                <span
                  class="text-3xl font-black text-white italic tracking-tighter transition-transform group-hover:scale-110">
                  9,99€
                </span>
                <span class="text-[10px] text-indigo-400 font-black uppercase tracking-widest mt-1"
                  >Mes + IVA</span
                >
              </div>
              <div v-else class="bg-emerald-500/20 p-2 rounded-full border border-emerald-500/30">
                <svg class="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </button>
        </div>

        <div v-if="profile?.plan?.toLowerCase() === 'pro'" class="mt-8 space-y-4">
          <div class="h-px bg-slate-800 w-full"></div>
          <button
            @click="emit('abrir-portal')"
            class="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-[11px] font-black uppercase tracking-[0.15em] text-slate-300">
            <span class="text-lg">⚙️</span> Configurar suscripción
          </button>
        </div>

        <p class="mt-6 text-center text-[9px] text-slate-500 font-bold uppercase tracking-widest">
          Pago seguro vía <span class="text-slate-300">Stripe</span> • Sin permanencia
        </p>
      </div>
    </div>
  </div>
</template>
