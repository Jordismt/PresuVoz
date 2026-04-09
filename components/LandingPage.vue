<script setup lang="ts">
const emit = defineEmits<{
  "ir-registro": [];
  "ir-login": [];
  "probar-invitado": []; // <--- AÑADE ESTO
}>();

const faqs = [
  {
    q: "¿Entiende catalán o acentos?",
    a: "Nuestra IA es políglota. Entiende castellano, catalán, gallego y cualquier acento regional sin que tengas que vocalizar como un locutor.",
  },
  {
    q: "¿Los PDF son profesionales?",
    a: "Totalmente. Incluyen tus datos fiscales, desglose de IVA y validez legal. Listos para enviar por WhatsApp al cliente.",
  },
  {
    q: "¿Puedo cancelar cuando quiera?",
    a: "Sin permanencias ni letras pequeñas. Puedes darte de baja con un solo clic desde tu panel de usuario en cualquier momento.",
  },
  {
    q: "¿Qué pasa si la IA se equivoca?",
    a: "Tú tienes el control. Antes de generar el PDF, verás una tabla donde puedes editar cualquier precio o texto de forma manual.",
  },
  {
    q: "¿Es seguro para mis datos?",
    a: "Usamos cifrado de alta seguridad. Tus datos y los de tus clientes están protegidos y nunca se comparten con terceros.",
  },
  {
    q: "¿Cómo funciona el primer gratis?",
    a: "Simplemente regístrate y tendrás 1 crédito de regalo. Podrás dictar, generar y descargar tu primer PDF real sin pagar nada.",
  },
];

const stats = [
  { n: "30s", t: "Creación" },
  { n: "100%", t: "Precisión" },
  { n: "+15h", t: "Tiempo libre" },
  { n: "A+", t: "Imagen Pro" },
];

const testimonios = [
  {
    texto:
      "Antes llegaba a casa a las 8 de la tarde y me ponía a escribir presupuestos. Ahora los envío desde la furgoneta nada más terminar el aviso. Una joya.",
    nombre: "Juan Rodríguez",
    oficio: "Fontanería",
    iniciales: "JR",
    color: "indigo",
  },
  {
    texto:
      "A mis clientes les encanta que les llegue el PDF por WhatsApp al momento. Da una imagen de profesionalidad que antes no tenía.",
    nombre: "Miguel Sánchez",
    oficio: "Instalaciones Eléctricas",
    iniciales: "MS",
    color: "emerald",
  },
  {
    texto:
      "Dictar los materiales y la mano de obra mientras recojo las herramientas me ahorra por lo menos 5 horas de oficina a la semana. Imprescindible.",
    nombre: "Carlos Arenas",
    oficio: "Reformas Integrales",
    iniciales: "CA",
    color: "orange",
  },
];

const pasos = [
  {
    num: 1,
    titulo: "Registro Express",
    desc: "Crea tu cuenta con un click usando Google. Pruebalo <span class='text-indigo-600 font-bold'>GRATIS (Sin tarjeta)</span>.",
    img: "/img/paso-registro.png",
    alt: "Registro Google",
    border: "",
  },
  {
    num: 2,
    titulo: "Habla o Escribe",
    desc: "Pulsa el micro y cuéntale a la IA lo que has hecho. Ella entiende cada detalle.",
    img: "/img/paso-audio.png",
    alt: "Dictando audio",
    border: "",
  },
  {
    num: 3,
    titulo: "Genera al instante",
    desc: "La IA desglosa materiales y precios automáticamente. Sin errores manuales.",
    img: "/img/paso-ia.png",
    alt: "IA procesando",
    border: "indigo",
  },
  {
    num: 4,
    titulo: "Previsualiza y Edita",
    desc: "¿Quieres ajustar un precio? Cámbialo a mano en la tabla antes de terminar.",
    img: "/img/paso-edicion.png",
    alt: "Edición de tabla",
    border: "indigo",
  },
  {
    num: 5,
    titulo: "WhatsApp y PDF",
    desc: "Envía el PDF profesional al cliente al momento. Cierra el trato en la obra.",
    img: "/img/paso-whatsapp.png",
    alt: "Envío por WhatsApp",
    border: "green",
  },
  {
    num: 6,
    titulo: "Historial Infinito",
    desc: "Recupera presupuestos viejos y úsalos de plantilla <span class='font-bold underline'>GRATIS en el PLAN PRO</span>.",
    img: "/img/paso-historial.png",
    alt: "Historial de presupuestos",
    border: "slate",
  },
];

const oficiosI = [
  "Pintores",
  "Electricistas",
  "Fontaneros",
  "Reformas",
  "Limpieza",
  "Carpinteros",
  "Climatización",
];
const oficiosII = ["Albañiles", "Jardineros", "Pladuristas", "Cerrajeros", "Montadores", "Reparaciones"];
const oficiosLinksI = [
  "/oficios/pintores",
  "/oficios/electricistas",
  "/oficios/fontaneros",
  "/oficios/reformas-integrales",
  "/oficios/limpieza",
  "/oficios/carpinteros",
  "/oficios/climatizacion",
];
const oficiosLinksII = [
  "/oficios/albaniles",
  "/oficios/jardineros",
  "/oficios/pladuristas",
  "/oficios/cerrajeros",
  "/oficios/montadores-muebles",
  "/oficios/tecnicos-electrodomesticos",
];
</script>

<template>
  <div
    class="min-h-screen bg-white selection:bg-indigo-600 selection:text-white text-slate-900 overflow-x-hidden antialiased">
    <component :is="'script'" type="application/ld+json">
      { "@context": "https://schema.org", "@type": "SoftwareApplication", "name": "PresuVoz AI",
      "operatingSystem": "Web", "applicationCategory": "BusinessApplication", "offers": { "@type":
      "AggregateOffer", "lowPrice": "0", "priceCurrency": "EUR" }, "aggregateRating": { "@type":
      "AggregateRating", "ratingValue": "4.9", "reviewCount": "1240" } }
    </component>

    <!-- NAV -->
    <nav class="fixed top-0 z-[100] w-full bg-white/80 backdrop-blur-xl border-b border-slate-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex justify-between items-center">
        <div
          class="flex items-center gap-2 sm:gap-3 group cursor-pointer"
          @click="window.scrollTo({ top: 0, behavior: 'smooth' })">
          <div class="relative shrink-0 transform -rotate-3 transition-transform hover:rotate-0 duration-300">
            <div class="absolute inset-0 bg-indigo-200 rounded-2xl blur-lg opacity-40 scale-90"></div>
            <img
              src="/logo.png"
              alt="Logo PresuVoz"
              class="relative w-12 h-12 object-contain bg-white rounded-2xl p-1.5 shadow-lg border border-slate-100" />
          </div>
          <span class="text-xl sm:text-2xl font-black tracking-tighter uppercase italic">PresuVoz</span>
        </div>
        <div class="flex items-center gap-3 sm:gap-8">
          <button
            @click="emit('ir-login')"
            class="hidden sm:block text-sm font-bold text-slate-500 hover:text-black transition-colors">
            Iniciar Sesion
          </button>
          <button
            @click="emit('probar-invitado')"
            class="px-5 sm:px-8 py-2.5 sm:py-3 bg-slate-900 text-white rounded-full text-xs sm:text-sm font-black hover:bg-indigo-600 transition-all shadow-xl active:scale-95">
            Probar Gratis ✨
          </button>
        </div>
      </div>
    </nav>

    <!-- HERO -->
    <header
      class="relative pt-32 sm:pt-48 pb-20 sm:pb-32 overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-white to-white">
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-30">
        <div
          class="absolute top-0 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-indigo-300 rounded-full blur-[80px] sm:blur-[120px]"></div>
        <div
          class="absolute bottom-0 right-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-violet-300 rounded-full blur-[80px] sm:blur-[120px]"></div>
      </div>

      <div class="max-w-7xl mx-auto px-6 text-center relative z-10">
        <div
          class="inline-flex items-center gap-3 bg-white border border-slate-200 p-1 pr-4 rounded-full mb-8 sm:mb-12 shadow-sm">
          <span
            class="bg-indigo-600 text-white text-[9px] sm:text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-tighter"
            >Dual Input</span
          >
          <span
            class="text-[9px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-[0.1em] sm:tracking-[0.2em]"
            >Dicta o Escribe. La IA genera el PDF.</span
          >
        </div>

        <h1
          class="text-4xl sm:text-6xl md:text-[90px] lg:text-[100px] font-black tracking-[-0.05em] mb-8 sm:mb-10 leading-[0.9] sm:leading-[0.85] text-slate-900 text-balance">
          Envia presupuestos
          <span class="text-indigo-600">en 30 segundos</span>
          <br class="hidden sm:block" />
          <span class="italic font-serif opacity-90">y consigue más clientes</span>
        </h1>

        <!-- Video demo -->
        <div
          class="bg-slate-900 rounded-[2.5rem] sm:rounded-[4rem] p-2 sm:p-4 shadow-2xl border border-slate-800 relative overflow-hidden">
          <div
            class="absolute top-6 right-6 z-10 bg-indigo-600 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl animate-bounce">
            Demo Real ✨
          </div>
          <div
            class="bg-white rounded-[2rem] sm:rounded-[3rem] overflow-hidden border border-slate-200 relative aspect-video lg:aspect-auto lg:h-[600px]">
            <video
              src="/videos/demo-presuvoz.mp4"
              autoplay
              loop
              muted
              playsinline
              class="w-full h-full object-cover shadow-inner"></video>
            <div
              class="absolute inset-0 pointer-events-none border-[12px] sm:border-[20px] border-white/10 rounded-[2rem] sm:rounded-[3rem]"></div>
          </div>
        </div>
        <br />

        <!-- PASOS -->
        <section class="py-20 bg-slate-50 rounded-[3rem] my-8">
          <div class="flex justify-center mb-16 px-6">
            <button
              @click="emit('probar-invitado')"
              class="group relative w-full max-w-md sm:w-auto px-10 py-6 bg-slate-900 text-white rounded-3xl font-black text-xl sm:text-2xl shadow-[0_20px_50px_rgba(79,70,229,0.3)] hover:shadow-[0_20px_50px_rgba(79,70,229,0.6)] hover:bg-indigo-600 transition-all duration-300 active:scale-95 overflow-hidden border-b-4 border-indigo-900 active:border-b-0">
              <div
                class="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

              <span class="relative z-10 flex items-center justify-center gap-3">
                Probar ahora Gratis ✨
                <span
                  class="text-sm font-bold bg-white/20 px-2 py-1 rounded-lg uppercase tracking-widest text-[10px]"
                  >Sin Registro</span
                >
              </span>

              <div
                class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
            </button>
          </div>
          <div class="max-w-7xl mx-auto px-6">
            <div class="text-center mb-16">
              <h2 class="text-4xl font-black text-slate-900 tracking-tighter mb-4 uppercase">
                ¿Cómo funciona PresuVoz?
              </h2>
              <p class="text-lg text-slate-500 font-medium max-w-2xl mx-auto">
                Del audio o texto al PDF en menos de 1 minuto. Así de fácil es profesionalizar tu negocio.
              </p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div
                v-for="paso in pasos"
                :key="paso.num"
                class="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all group flex flex-col"
                :class="
                  paso.border === 'indigo'
                    ? 'border-b-4 border-b-indigo-500'
                    : paso.border === 'green'
                      ? 'border-b-4 border-b-green-500'
                      : paso.border === 'slate'
                        ? 'border-b-4 border-b-slate-800'
                        : ''
                ">
                <div
                  class="w-full aspect-video rounded-3xl mb-6 overflow-hidden border flex items-center justify-center p-4"
                  :class="
                    paso.border === 'indigo'
                      ? 'bg-indigo-50 border-indigo-100'
                      : paso.border === 'green'
                        ? 'bg-green-50 border-green-100'
                        : paso.border === 'slate'
                          ? 'bg-slate-200 border-slate-300'
                          : 'bg-slate-100 border-slate-50'
                  ">
                  <img
                    :src="paso.img"
                    :alt="paso.alt"
                    class="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div class="flex items-center gap-3 mb-4">
                  <div
                    class="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg"
                    :class="
                      paso.border === 'slate' ? 'bg-slate-800 text-white' : 'bg-indigo-100 text-indigo-600'
                    ">
                    {{ paso.num }}
                  </div>
                  <h3 class="text-xl font-black text-slate-800 italic">{{ paso.titulo }}</h3>
                </div>
                <p class="text-slate-500 text-sm leading-relaxed font-medium" v-html="paso.desc"></p>
              </div>
            </div>
          </div>
        </section>

        <!-- CTA + Avatares -->
        <div class="flex flex-col items-center gap-8 sm:gap-10">
          <div class="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div class="flex -space-x-3">
              <img
                v-for="i in 4"
                :key="i"
                :src="`https://i.pravatar.cc/100?img=${i + 30}`"
                class="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-4 border-white shadow-lg" />
            </div>
            <div class="text-center sm:text-left">
              <p class="text-sm font-black text-slate-900">+100 autónomos</p>
              <p class="text-xs font-bold text-slate-400 italic">Ahorran 15 horas de oficina al mes</p>
            </div>
          </div>
        </div>
        <br />

        <p
          class="max-w-3xl mx-auto text-lg sm:text-xl text-slate-600 mb-12 sm:mb-16 leading-relaxed px-4 text-balance">
          La herramienta de <strong>presupuestos por voz</strong> para fontaneros, electricistas y
          profesionales de las reformas.
          <span class="block mt-4 text-slate-500 font-normal">
            Dicta tus trabajos y genera un <strong>presupuesto profesional en PDF</strong> listo para enviar
            por WhatsApp en solo 30 segundos.
          </span>
        </p>
        <p class="text-center mt-8 text-slate-400 text-sm font-medium">
          Voz real procesada con nuestra IA en menos de 10 segundos.
        </p>
      </div>
    </header>

    <!-- SECCIÓN PROBLEMA/SOLUCIÓN -->
    <section class="py-20 sm:py-32 bg-slate-900 text-white overflow-hidden relative">
      <div class="max-w-7xl mx-auto px-6 relative z-10">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          <div>
            <h2
              class="text-4xl sm:text-5xl font-black tracking-tighter mb-8 sm:mb-12 leading-none text-balance text-center lg:text-left">
              Deja de ser un <br /><span class="text-indigo-400 italic">esclavo del papel.</span>
            </h2>
            <div class="space-y-6 sm:space-y-8">
              <div
                class="flex flex-col sm:flex-row gap-4 sm:gap-6 p-6 rounded-3xl bg-white/5 border border-white/10">
                <div class="text-3xl">📝</div>
                <div>
                  <h4 class="font-black text-lg mb-1 italic">El método antiguo</h4>
                  <p class="text-slate-400 text-sm">
                    Llegar a casa cansado, buscar el bloc, encender el PC y pelearte con Excel. 2 horas
                    perdidas.
                  </p>
                </div>
              </div>
              <div
                class="flex flex-col sm:flex-row gap-4 sm:gap-6 p-6 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 shadow-2xl">
                <div class="text-3xl">🎙️</div>
                <div>
                  <h4 class="font-black text-lg mb-1 italic">El método PresuVoz</h4>
                  <p class="text-slate-100 text-sm font-medium">
                    Acabas la obra, dictas 20 segundos y envías el PDF por WhatsApp. 0 minutos perdidos.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3 sm:gap-4">
            <div
              v-for="stat in stats"
              :key="stat.t"
              class="p-6 sm:p-10 bg-white/5 border border-white/10 rounded-2xl sm:rounded-[2.5rem] text-center">
              <p class="text-3xl sm:text-4xl font-black text-indigo-400 mb-1 sm:mb-2 tracking-tighter">
                {{ stat.n }}
              </p>
              <p class="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500">
                {{ stat.t }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- PRECIOS -->
    <section class="py-20 sm:py-40 bg-white">
      <div class="max-w-5xl mx-auto px-6 text-center">
        <div class="mb-16 sm:mb-24">
          <h2
            class="text-xs sm:text-sm font-black text-indigo-600 uppercase tracking-[0.3em] sm:tracking-[0.4em] mb-4">
            Precios sin letra pequeña
          </h2>
          <p
            class="text-4xl sm:text-6xl font-black tracking-tighter text-slate-900 leading-[1.1] sm:leading-none">
            Mismas funciones. <br />Diferente volumen.
          </p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10 items-stretch max-w-4xl mx-auto">
          <!-- Plan ocasional -->
          <div
            class="p-8 sm:p-12 bg-white rounded-[2.5rem] sm:rounded-[3.5rem] border-2 border-slate-100 flex flex-col justify-between hover:border-indigo-600/20 hover:shadow-2xl transition-all duration-500 group relative">
            <div class="text-left">
              <span
                class="inline-block px-4 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest mb-6 sm:mb-8"
                >Ocasional</span
              >
              <h4 class="text-2xl sm:text-3xl font-black mb-2 italic">1 Crédito</h4>
              <p class="text-slate-500 text-sm mb-8 sm:mb-10 leading-relaxed font-medium italic">
                "Solo necesito este presupuesto ahora mismo".
              </p>
              <div class="flex items-baseline gap-2 mb-10 sm:mb-12">
                <span class="text-6xl sm:text-7xl font-black tracking-tighter text-slate-900">1,59€</span>
                <span class="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest"
                  >/ total</span
                >
              </div>
              <ul class="space-y-4 mb-10 sm:mb-12 text-xs sm:text-[13px] font-bold text-slate-700">
                <li
                  v-for="feat in ['Envío directo por WhatsApp', 'PDF con tus datos fiscales']"
                  :key="feat"
                  class="flex items-center gap-3">
                  <div
                    class="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px]">
                    ✓
                  </div>
                  {{ feat }}
                </li>
              </ul>
            </div>
            <button
              @click="emit('ir-registro')"
              class="w-full py-5 sm:py-6 rounded-2xl sm:rounded-3xl bg-slate-50 text-slate-900 font-black hover:bg-black hover:text-white transition-all uppercase text-[10px] sm:text-xs tracking-widest border border-slate-200">
              Comprar 1 Crédito
            </button>
          </div>

          <!-- Plan Pro -->
          <div
            class="p-8 sm:p-12 bg-slate-900 rounded-[2.5rem] sm:rounded-[3.5rem] text-white relative flex flex-col justify-between shadow-2xl md:scale-105 z-10 overflow-hidden border border-indigo-500/30">
            <div
              class="absolute top-0 right-0 bg-indigo-600 px-6 sm:px-8 py-2 sm:py-3 rounded-bl-2xl sm:rounded-bl-[2rem] text-[9px] sm:text-[11px] font-black uppercase tracking-widest shadow-2xl animate-pulse">
              Ahorras 30€ al mes
            </div>
            <div class="text-left">
              <span
                class="inline-block px-4 py-1 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-6 sm:mb-8"
                >Profesional</span
              >
              <h4 class="text-3xl sm:text-4xl font-black mb-2 italic">25 Créditos</h4>
              <p class="text-slate-400 text-sm mb-8 sm:mb-10 leading-relaxed font-medium italic">
                Para los que no paran de cerrar clientes.
              </p>
              <div class="flex items-baseline gap-2 mb-10 sm:mb-12">
                <span class="text-7xl sm:text-8xl font-black tracking-tighter text-white">9,99€</span>
                <span class="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-widest"
                  >/ mes</span
                >
              </div>
              <ul class="space-y-4 mb-10 sm:mb-12 text-xs sm:text-[13px] font-bold">
                <li class="flex items-center gap-3">
                  <div
                    class="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px]">
                    ★
                  </div>
                  Cada presupuesto a <span class="text-indigo-400 italic">0,40€</span>
                </li>
                <li class="flex items-center gap-3 text-indigo-100">
                  <div
                    class="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px]">
                    ★
                  </div>
                  Renovación automática
                </li>
                <li class="flex items-center gap-3">
                  <div
                    class="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px]">
                    ★
                  </div>
                  Incluye todas las funciones Pro
                </li>
                <li class="flex items-center gap-3">
                  <div
                    class="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px]">
                    ★
                  </div>
                  Historial de Presupuestos
                </li>
              </ul>
            </div>
            <button
              @click="emit('ir-registro')"
              class="w-full py-6 sm:py-7 rounded-2xl sm:rounded-3xl bg-indigo-600 text-white font-black hover:bg-indigo-500 transition-all uppercase text-[10px] sm:text-xs tracking-widest shadow-xl active:scale-95">
              Activar Plan Mensual
            </button>
          </div>
        </div>

        <div
          class="mt-16 sm:mt-20 inline-flex items-center gap-3 sm:gap-4 px-5 py-2.5 bg-slate-50 rounded-2xl border border-slate-100">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg"
            class="h-3.5 sm:h-4 opacity-40"
            alt="Stripe" />
          <span class="h-4 w-[1px] bg-slate-200"></span>
          <p class="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
            Pago seguro por Stripe
          </p>
        </div>
      </div>
    </section>

    <!-- TESTIMONIOS -->
    <section class="py-16 bg-slate-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <h2 class="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Lo que dicen otros profesionales</h2>
          <p class="text-lg text-slate-600 max-w-2xl mx-auto">
            Autónomos que ya han dejado de perder horas de oficina y han pasado al presupuesto por voz.
          </p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div
            v-for="t in testimonios"
            :key="t.nombre"
            class="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div class="flex items-center gap-1 text-amber-400 mb-4"><span>★★★★★</span></div>
            <p class="text-slate-600 italic mb-6">"{{ t.texto }}"</p>
            <div class="flex items-center gap-4">
              <div
                :class="`bg-${t.color}-100 text-${t.color}-600`"
                class="w-12 h-12 rounded-full flex items-center justify-center font-bold">
                {{ t.iniciales }}
              </div>
              <div>
                <h4 class="font-bold text-slate-900">{{ t.nombre }}</h4>
                <p class="text-sm text-slate-500">{{ t.oficio }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="py-20 sm:py-32 bg-slate-50 border-t border-slate-200/50 relative overflow-hidden">
      <div
        class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none"></div>
      <div class="max-w-4xl mx-auto px-6 relative">
        <div class="text-center mb-16">
          <h2 class="text-3xl sm:text-5xl font-black text-slate-900 tracking-tighter italic">
            Preguntas <span class="text-indigo-600">frecuentes</span>
          </h2>
          <p class="mt-4 text-slate-500 font-medium">Todo lo que necesitas saber antes de empezar</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div
            v-for="faq in faqs"
            :key="faq.q"
            class="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col h-full">
            <h4 class="font-black text-slate-900 text-lg mb-3 tracking-tight flex items-start gap-2">
              <span class="text-indigo-600 text-xl italic">?</span>
              {{ faq.q }}
            </h4>
            <p class="text-slate-500 text-sm font-medium leading-relaxed flex-grow">{{ faq.a }}</p>
          </div>
        </div>
        <div class="mt-12 p-6 bg-indigo-600 rounded-[2rem] text-center shadow-xl shadow-indigo-200">
          <p class="text-white font-bold text-sm">¿Tienes otra duda técnica?</p>
          <a
            href="mailto:jcasoldev@gmail.com"
            class="inline-block mt-2 text-indigo-100 hover:text-white font-black border-b border-indigo-400 border-dashed transition-colors">
            Escríbenos y te respondemos lo mas rápido posible ⚡
          </a>
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="bg-white pt-20 sm:pt-32 pb-12 border-t border-slate-100">
      <div
        class="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8 mb-20 text-balance">
        <div class="col-span-1 lg:col-span-2 text-center sm:text-left">
          <div class="flex items-center justify-center sm:justify-start gap-3 mb-6 sm:mb-8">
            <div
              class="w-8 h-8 sm:w-10 sm:h-10 bg-black rounded-xl flex items-center justify-center text-white font-black italic shadow-lg">
              P
            </div>
            <span class="text-xl sm:text-2xl font-black tracking-tighter italic uppercase">PresuVoz</span>
          </div>
          <p
            class="text-slate-400 font-bold max-w-sm text-base sm:text-lg leading-tight uppercase italic opacity-50 mx-auto sm:mx-0">
            Dedicado a los que construyen el mañana con sus propias manos.
          </p>
          <div class="mt-8 flex items-center justify-center sm:justify-start gap-2">
            <span class="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            <span class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400"
              >Sistema Operativo v3.1</span
            >
          </div>
        </div>

        <div class="text-center sm:text-left">
          <h5 class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-6 sm:mb-8 italic">
            Oficios I
          </h5>
          <ul class="space-y-3 sm:space-y-4 font-bold text-slate-500 text-[11px] uppercase tracking-widest">
            <li v-for="(oficio, i) in oficiosI" :key="oficio">
              <NuxtLink :to="oficiosLinksI[i]" class="hover:text-black">{{ oficio }}</NuxtLink>
            </li>
          </ul>
        </div>

        <div class="text-center sm:text-left">
          <h5 class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-6 sm:mb-8 italic">
            Oficios II
          </h5>
          <ul class="space-y-3 sm:space-y-4 font-bold text-slate-500 text-[11px] uppercase tracking-widest">
            <li v-for="(oficio, i) in oficiosII" :key="oficio">
              <NuxtLink :to="oficiosLinksII[i]" class="hover:text-black">{{ oficio }}</NuxtLink>
            </li>
          </ul>
        </div>

        <div class="text-center sm:text-left">
          <h5 class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-6 sm:mb-8 italic">
            Soporte & Legal
          </h5>
          <ul
            class="space-y-3 sm:space-y-4 font-bold text-slate-500 text-[11px] uppercase tracking-widest mb-8">
            <li><NuxtLink to="/legal/privacidad" class="hover:text-black">Privacidad</NuxtLink></li>
            <li><NuxtLink to="/legal/terminos" class="hover:text-black">Términos</NuxtLink></li>
            <li><NuxtLink to="/legal/aviso-legal" class="hover:text-black">Aviso Legal</NuxtLink></li>
          </ul>
          <a
            href="mailto:jcasoldev@gmail.com"
            class="text-indigo-600 font-black text-sm block hover:underline tracking-tighter uppercase italic"
            >jcasoldev@gmail.com</a
          >
          <p class="text-slate-400 text-[10px] font-black uppercase mt-2 tracking-widest">España 🇪🇸</p>
        </div>
      </div>

      <div
        class="max-w-7xl mx-auto px-6 pt-12 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-8">
        <div
          class="flex items-center gap-6 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg"
            class="h-4 sm:h-5"
            alt="Stripe" />
        </div>
        <p
          class="text-[9px] sm:text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] sm:tracking-[0.4em] text-center">
          © 2026 PresuVoz AI • Built for makers.
        </p>
      </div>
    </footer>
  </div>
</template>
