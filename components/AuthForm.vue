<script setup lang="ts">
import { ref } from "vue";
import { supabase, signInWithGoogle } from "~/lib/supabase";

const emit = defineEmits<{
  authenticated: [];
  "volver-landing": [];
}>();

const email = ref("");
const password = ref("");
const esRegistro = ref(false);
const cargandoAuth = ref(false);
const registroExitoso = ref(false);

const handleGoogleAuth = async () => {
  cargandoAuth.value = true;
  try {
    const { error } = await signInWithGoogle();
    if (error) throw error;
  } catch (error: any) {
    alert("Error al conectar con Google: " + error.message);
    cargandoAuth.value = false;
  }
};

const handleAuth = async () => {
  cargandoAuth.value = true;
  if (esRegistro.value) {
    const { error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
    });
    if (error) {
      alert("Error: " + error.message);
    } else {
      registroExitoso.value = true;
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });
    if (error) alert("Error: " + error.message);
  }
  cargandoAuth.value = false;
};
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-indigo-50 via-white to-slate-100 relative">
    <button
      @click="emit('volver-landing')"
      class="absolute top-8 left-8 text-slate-400 hover:text-indigo-600 font-bold flex items-center gap-2 transition-colors">
      ← Volver
    </button>

    <div
      class="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-md border border-white relative overflow-hidden">
      <!-- Registro exitoso -->
      <div v-if="registroExitoso" class="text-center py-6 animate-in zoom-in duration-300">
        <div
          class="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
          📩
        </div>
        <h2 class="text-2xl font-black text-slate-800 mb-4">¡Casi listo!</h2>
        <p class="text-slate-500 font-medium leading-relaxed">
          Hemos enviado un enlace de confirmación a <br />
          <span class="text-indigo-600 font-bold">{{ email }}</span
          >.
        </p>
        <div class="mt-6 text-sm bg-amber-50 text-amber-700 p-4 rounded-2xl font-medium text-left">
          ⚠️ <strong>Importante:</strong> Debes pulsar el botón que hay dentro del correo para activar tu
          cuenta. Si no te llega, mira en <strong>Spam</strong>.
        </div>
        <button
          @click="
            registroExitoso = false;
            esRegistro = false;
          "
          class="mt-8 text-indigo-600 font-black uppercase text-[10px] tracking-widest hover:underline">
          Ir al Inicio de Sesión →
        </button>
      </div>

      <!-- Formulario normal -->
      <div v-else>
        <div class="text-center mb-10">
          <div
            :class="esRegistro ? 'bg-indigo-600' : 'bg-slate-800'"
            class="inline-block px-4 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-[0.2em] mb-6 shadow-sm">
            {{ esRegistro ? "Nuevo Usuario" : "Acceso Clientes" }}
          </div>
          <div
            class="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-3xl font-black mx-auto mb-4 shadow-lg shadow-indigo-100 transform -rotate-3">
            P
          </div>
          <h1 class="text-3xl font-extrabold tracking-tight">
            {{
              esRegistro
                ? "Crea tu cuenta y recupera tus tardes"
                : "¡Hola! Listos para el siguiente presupuesto"
            }}
          </h1>
          <p class="mt-2 text-slate-500 font-medium text-sm md:text-base">
            {{
              esRegistro
                ? "🎁 Te regalamos tus 3 primeros presupuestos al registrarte. Sin tarjetas. Prueba el dictado por voz y genera tus PDF profesionales al instante."
                : "Entra para gestionar tus presupuestos y clientes."
            }}
          </p>
        </div>

        <!-- Google primero -->
        <button
          type="button"
          @click="handleGoogleAuth"
          :disabled="cargandoAuth"
          class="w-full flex items-center justify-center gap-3 p-5 rounded-2xl bg-white border-2 border-slate-100 hover:border-indigo-600 hover:bg-slate-50 transition-all active:scale-[0.98] shadow-sm group mb-4">
          <img
            v-if="!cargandoAuth"
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            class="w-6 h-6 group-hover:scale-110 transition-transform"
            alt="Google" />
          <span
            v-else
            class="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
          <span class="text-slate-700 font-bold tracking-tight">
            {{ esRegistro ? "Registrarse con Google" : "Entrar con Google" }}
          </span>
        </button>

        <div class="relative flex py-2 items-center mb-4">
          <div class="flex-grow border-t border-slate-100"></div>
          <span class="flex-shrink mx-4 text-[10px] font-black text-slate-300 uppercase tracking-widest"
            >o con tu email</span
          >
          <div class="flex-grow border-t border-slate-100"></div>
        </div>

        <div class="space-y-4">
          <input
            v-model="email"
            type="email"
            placeholder="Correo electrónico"
            class="w-full p-5 rounded-2xl bg-slate-50 border-2 border-transparent outline-none focus:border-indigo-500 transition-all focus:bg-white font-medium" />
          <input
            v-model="password"
            type="password"
            placeholder="Tu contraseña"
            class="w-full p-5 rounded-2xl bg-slate-50 border-2 border-transparent outline-none focus:border-indigo-500 transition-all focus:bg-white font-medium" />

          <button
            @click="handleAuth"
            :disabled="cargandoAuth"
            :class="
              esRegistro
                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
                : 'bg-slate-900 hover:bg-black shadow-slate-200'
            "
            class="w-full text-white p-5 rounded-2xl font-bold shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3">
            <span
              v-if="cargandoAuth"
              class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            <span>{{ esRegistro ? "Empezar ahora gratis" : "Entrar en PresuVoz" }}</span>
          </button>

          <button
            @click="esRegistro = !esRegistro"
            class="w-full text-center text-sm font-bold text-slate-400 hover:text-indigo-600 transition-colors mt-2">
            {{ esRegistro ? "¿Ya tienes cuenta? Inicia sesión aquí" : "¿No tienes cuenta? Crea una gratis" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
