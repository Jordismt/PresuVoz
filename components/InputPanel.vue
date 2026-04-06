<script setup lang="ts">
defineProps<{
  transcripcion: string;
  grabando: boolean;
  textoEnVivo: string;
  cargandoIA: boolean;
  profile: any;
}>();

const emit = defineEmits<{
  "update:transcripcion": [value: string];
  "toggle-grabacion": [];
  generar: [];
  limpiar: [];
}>();
</script>

<template>
  <div class="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200/60 relative overflow-hidden">
    <div class="flex items-center justify-between mb-6">
      <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">
        Instrucciones del presupuesto
      </label>
      <button
        v-if="transcripcion"
        @click="emit('limpiar')"
        class="text-[10px] font-bold text-red-400 hover:text-red-600 transition-colors uppercase tracking-widest">
        Borrar ×
      </button>
    </div>

    <div class="relative group">
      <textarea
        :value="transcripcion"
        @input="emit('update:transcripcion', ($event.target as HTMLTextAreaElement).value)"
        placeholder='Ej: "Presupuesto para Juan, instalar 4 enchufes a 50€ cada uno..."'
        class="w-full min-h-[220px] bg-slate-50/50 rounded-[2rem] p-6 text-sm font-medium text-slate-600 leading-relaxed border-2 border-dashed border-slate-100 focus:border-indigo-500 focus:bg-white focus:ring-0 outline-none transition-all resize-none italic"></textarea>

      <div
        v-if="grabando"
        class="absolute bottom-4 right-6 flex items-center gap-2 bg-red-50 text-red-500 px-3 py-1.5 rounded-full border border-red-100 shadow-sm">
        <span class="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
        <span class="text-[10px] font-black uppercase tracking-tighter">Micro Activo</span>
      </div>
    </div>

    <div
      v-if="textoEnVivo"
      class="mt-4 bg-indigo-600 p-4 rounded-[1.5rem] shadow-xl shadow-indigo-100 animate-in slide-in-from-top-2 duration-300">
      <div class="flex items-center gap-3">
        <div class="flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-white opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </div>
        <p class="text-[13px] font-bold text-white italic leading-tight">"{{ textoEnVivo }}..."</p>
      </div>
    </div>

    <div class="grid grid-cols-5 gap-3 mt-6">
      <button
        @click="emit('toggle-grabacion')"
        :class="
          grabando
            ? 'bg-red-500 shadow-red-200 ring-4 ring-red-50 text-white'
            : 'bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'
        "
        class="col-span-1 h-16 rounded-2xl flex items-center justify-center transition-all active:scale-95"
        title="Dictar por voz">
        <span class="text-2xl">{{ grabando ? "⏹" : "🎙️" }}</span>
      </button>

      <button
        @click="emit('generar')"
        :disabled="cargandoIA || !transcripcion || profile?.requests_used >= profile?.requests_limit"
        :class="
          profile?.requests_used >= profile?.requests_limit
            ? 'bg-slate-300'
            : 'bg-slate-900 hover:bg-black active:scale-[0.98]'
        "
        class="col-span-4 h-16 text-white rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-xl shadow-slate-200">
        <span v-if="!cargandoIA" class="flex items-center gap-2"> ✨ <span>Generar presupuesto</span> </span>
        <span v-else class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
      </button>
    </div>

    <p
      v-if="profile?.requests_used >= profile?.requests_limit"
      class="text-center text-[10px] text-red-500 font-bold mt-4 uppercase tracking-tighter">
      ⚠️ Créditos agotados. Recarga para continuar.
    </p>
  </div>
</template>
