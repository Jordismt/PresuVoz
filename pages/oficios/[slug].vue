<script setup>
const route = useRoute()
const slug = route.params.slug

// Diccionario de datos para que cada página sea única
const oficiosData = {
  'pintores': {
    titulo: 'Presupuestos de Pintura por Voz',
    descripcion: 'Dicta los botes de pintura, metros y horas. Genera tu presupuesto de pintor en 30 segundos.',
    ejemplo: 'Pintar salón de 25m2 con pintura plástica blanca mate, dos manos, emplastecer grietas y encintado de rodapiés.'
  },
  'electricistas': {
    titulo: 'Presupuestos para Electricistas',
    descripcion: 'Genera boletines o presupuestos de instalaciones eléctricas hablando al móvil.',
    ejemplo: 'Instalación de cuadro eléctrico de 12 elementos, sustitución de 15 mecanismos Niessen y boletín de enganche.'
  },
  'fontaneros': {
    titulo: 'Presupuestos de Fontanería',
    descripcion: 'Crea presupuestos para averías, instalaciones o cambios de sanitarios por voz.',
    ejemplo: 'Cambio de bajante de PVC en comunidad, sustitución de grifería de ducha y sellado de placa con silicona.'
  },
  'reformas-integrales': {
    titulo: 'Presupuestos de Reformas',
    descripcion: 'La herramienta definitiva para jefes de obra. Organiza partidas de reforma en segundos.',
    ejemplo: 'Demolición de tabiquería, desescombro, solado de cocina con gres cerámico y alicatado de baño completo.'
  },
  'limpieza': {
    titulo: 'Presupuestos de Limpieza',
    descripcion: 'Ideal para empresas de limpieza de fin de obra, comunidades o cristales.',
    ejemplo: 'Limpieza de fin de obra en piso de 90m2, limpieza de cristales exteriores y abrillantado de terrazo.'
  },
  'carpinteros': {
    titulo: 'Presupuestos de Carpintería',
    descripcion: 'Gestiona tus trabajos de madera o aluminio hablando directamente a tu móvil.',
    ejemplo: 'Sustitución de 5 puertas de paso en roble, montaje de armario empotrado a medida y cepillado de marcos.'
  },
  'climatizacion': {
    titulo: 'Presupuestos de Aire Acondicionado',
    descripcion: 'Crea presupuestos de instalación o mantenimiento de clima y calefacción.',
    ejemplo: 'Instalación de Split 3000 frigorías, precarga de gas R32 y 5 metros de línea frigorífica con canaleta.'
  },
  'albaniles': {
    titulo: 'Presupuestos de Albañilería',
    descripcion: 'Genera presupuestos de muros, solados o desescombros de forma rápida.',
    ejemplo: 'Levantamiento de tabique de ladrillo del 7, raseo con mortero y apertura de rozas para instalaciones.'
  },
  'jardineros': {
    titulo: 'Presupuestos de Jardinería',
    descripcion: 'Perfecto para mantenimientos de jardines, podas o sistemas de riego.',
    ejemplo: 'Mantenimiento mensual de jardín privado, poda de setos, abono orgánico y revisión de programador de riego.'
  },
  'pladuristas': {
    titulo: 'Presupuestos de Pladur',
    descripcion: 'Calcula techos, trasdosados y tabiques de cartón yeso en un momento.',
    ejemplo: 'Montaje de techo continuo de Pladur, aislamiento con lana de roca y encintado de juntas con pasta.'
  },
  'cerrajeros': {
    titulo: 'Presupuestos de Cerrajería',
    descripcion: 'Genera presupuestos por cambios de bombín, aperturas o persianas metálicas.',
    ejemplo: 'Cambio de bombín de seguridad antibumping, ajuste de cierre de persiana y lubricación de carriles.'
  },
  'montadores-muebles': {
    titulo: 'Presupuestos de Montaje de Muebles',
    descripcion: 'Calcula montajes de cocinas o muebles modulares dictando las piezas.',
    ejemplo: 'Montaje de cocina en L, instalación de encimera, ajuste de puertas y montaje de electrodomésticos integrables.'
  },
  'tecnicos-electrodomesticos': {
    titulo: 'Presupuestos de Reparación',
    descripcion: 'Presupuesta averías de lavadoras, calderas o neveras al momento.',
    ejemplo: 'Cambio de placa electrónica en lavadora, desplazamiento incluido y 1 hora de mano de obra.'
  }
}

const data = oficiosData[slug] || oficiosData['pintores'] // Fallback

// IMPORTANTE: Esto es lo que lee Google
useSeoMeta({
  title: `Presupuestos para ${slug} por Voz y Texto | PresuVoz`,
  ogTitle: `Software de Presupuestos para ${slug} - Rápido y Fácil`,
  description: `¿Eres ${slug}? Genera presupuestos profesionales en PDF dictando o escribiendo. La IA más rápida para autónomos en España. ¡Pruébalo gratis!`,
  ogDescription: `Ahorra horas de oficina. Crea presupuestos de ${slug} desde el móvil y envíalos por WhatsApp al instante.`,
  keywords: `presupuestos ${slug}, software para ${slug}, presupuestos por voz, ia para autonomos, hacer presupuestos movil`,
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <main class="relative min-h-screen overflow-x-hidden bg-slate-950 font-sans text-slate-200 selection:bg-blue-500/30">
    <div class="fixed inset-0 z-0 pointer-events-none opacity-20 [background-image:url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
    <div class="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(59,130,246,0.15),transparent_70%)]"></div>

    <header class="relative z-10 mx-auto max-w-7xl px-6 py-6 flex items-center justify-between" data-aos="fade-down">
      <NuxtLink to="/" class="text-xl font-extrabold tracking-tighter text-white">
        Presu<span class="text-blue-500">Voz</span>
      </NuxtLink>
      <NuxtLink to="/" class="rounded-full border border-slate-800 bg-slate-900/50 px-5 py-2 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-slate-800 active:scale-95">
        Probar Gratis
      </NuxtLink>
    </header>

<section class="relative z-10 overflow-hidden bg-slate-50 px-6 pt-20 pb-24 lg:pt-32">
    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.08),transparent_70%)]"></div>

    <div class="mx-auto max-w-7xl">
      <div class="grid items-center gap-12 lg:grid-cols-2">
        
        <div class="text-left">
          <div class="mb-6 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 border border-indigo-100" data-aos="fade-right">
            <span class="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Especial para {{ slug.replace('-', ' ') }}
          </div>
          
          <h1 class="mb-6 text-5xl font-[900] leading-[1.1] tracking-tight text-slate-900 sm:text-7xl" data-aos="fade-up">
            Dicta. Escribe. <br />
            <span class="text-indigo-600">Cobra antes.</span>
          </h1>
          
          <p class="mb-10 max-w-xl text-lg leading-relaxed text-slate-600 sm:text-xl" data-aos="fade-up" data-aos-delay="100">
            La herramienta más rápida para {{ slug.replace('-', ' ') }}. Convierte tus instrucciones de voz o texto en presupuestos profesionales en segundos. Sin oficinas, directamente desde el móvil.
          </p>
          
          <div class="flex flex-col gap-5 sm:flex-row sm:items-center" data-aos="fade-up" data-aos-delay="200">
            <NuxtLink to="/" class="group relative flex items-center justify-center gap-3 rounded-2xl bg-indigo-600 px-8 py-4 text-lg font-bold text-white shadow-[0_10px_20px_-5px_rgba(79,70,229,0.4)] transition-all hover:bg-indigo-700 hover:shadow-indigo-300 active:scale-95">
              Probar Gratis
              <svg class="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
            </NuxtLink>
            
            <div class="flex flex-col px-2">
              <div class="flex items-center gap-1 text-amber-500">
                <svg v-for="i in 5" :key="i" class="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
              </div>
              <p class="text-xs font-bold text-slate-500 uppercase tracking-tighter">Utilizado por +100 profesionales</p>
            </div>
          </div>
        </div>

        <div class="relative hidden lg:block" data-aos="fade-left">
          <div class="absolute -inset-10 bg-indigo-500/10 blur-[80px] rounded-full"></div>
          
          <div class="relative mx-auto w-full max-w-[480px] rounded-[2.5rem] border-[8px] border-white bg-white p-6 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)]">
            <div class="space-y-6">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-[10px]">P</div>
                  <span class="text-xs font-bold text-slate-400">PRESUVOZ <span class="text-indigo-600">PRO</span></span>
                </div>
                <div class="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500">25 CRÉDITOS</div>
              </div>

              <div class="rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/50 p-5 text-center">
                <p class="text-[10px] font-bold text-slate-400 uppercase mb-3">Instrucciones del presupuesto</p>
                <div class="bg-white rounded-xl p-3 shadow-sm border border-slate-100 text-left">
                  <p class="text-xs text-slate-500 italic leading-relaxed">
                    "Presupuesto para {{ slug.replace('-', ' ') }}, instalar materiales según obra y mano de obra de hoy..."
                  </p>
                </div>
                <div class="mt-4 flex gap-2">
                  <div class="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600">🎙️</div>
                  <div class="flex-1 bg-slate-900 rounded-xl flex items-center justify-center text-[10px] font-bold text-white tracking-widest gap-2">
                    ✨ GENERAR PRESUPUESTO
                  </div>
                </div>
              </div>

              <div class="h-40 rounded-[2rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-center p-6">
                <div class="text-3xl mb-2">📄</div>
                <p class="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">Esperando instrucciones...</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </section>

    <div class="relative z-10 mt-12 overflow-hidden py-8 border-y border-slate-900 bg-slate-950/50 backdrop-blur-sm" data-aos="fade-up">
      <div class="container mx-auto px-6">
        <p class="mb-6 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-slate-600">Tecnología de respuesta instantánea</p>
        <div class="flex flex-wrap justify-center gap-6 opacity-40 grayscale transition-all hover:grayscale-0">
          <span class="text-sm font-black tracking-tighter sm:text-lg">GROQ_SPEED</span>
          <span class="text-sm font-black tracking-tighter sm:text-lg">LLAMA_3.1</span>
          <span class="text-sm font-black tracking-tighter sm:text-lg">WHISPER_V3</span>
        </div>
      </div>
    </div>

    <section class="relative z-10 px-6 py-20">
      <div class="mx-auto max-w-5xl">
        <h2 class="mb-12 text-center text-3xl font-bold tracking-tight text-white sm:text-4xl" data-aos="fade-up">Recupera tus noches</h2>
        <div class="grid gap-6 md:grid-cols-2">
          <div class="rounded-3xl border border-slate-900 bg-slate-900/30 p-8" data-aos="fade-right">
            <h3 class="mb-6 text-lg font-bold uppercase tracking-widest text-slate-500">Antes</h3>
            <ul class="space-y-4">
              <li class="flex items-start gap-3 text-slate-400"><span class="text-red-500">❌</span> 2 horas de papeleo al llegar a casa</li>
              <li class="flex items-start gap-3 text-slate-400"><span class="text-red-500">❌</span> Errores de cálculo en materiales e IVA</li>
              <li class="flex items-start gap-3 text-slate-400"><span class="text-red-500">❌</span> Olvidar cobrar pequeños extras</li>
            </ul>
          </div>
          <div class="rounded-3xl border border-blue-500/30 bg-blue-500/5 p-8 shadow-[0_0_50px_-12px_rgba(59,130,246,0.1)]" data-aos="fade-left">
            <h3 class="mb-6 text-lg font-bold uppercase tracking-widest text-blue-400">Con PresuVoz</h3>
            <ul class="space-y-4">
              <li class="flex items-start gap-3 text-slate-200"><span class="text-green-500">✅</span> Presupuesto enviado antes de subir a la furgoneta</li>
              <li class="flex items-start gap-3 text-slate-200"><span class="text-green-500">✅</span> IA que ajusta precios y márgenes</li>
              <li class="flex items-start gap-3 text-slate-200"><span class="text-green-500">✅</span> Envío nativo por WhatsApp</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section class="relative z-10 px-6 py-20 bg-slate-900/20">
      <div class="mx-auto max-w-6xl">
        <h2 class="mb-16 text-center text-3xl font-bold text-white sm:text-4xl" data-aos="fade-up">Flexibilidad total: Tú eliges</h2>
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
          
          <div class="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 p-8 lg:col-span-2" data-aos="fade-up">
            <div class="relative z-10">
              <span class="mb-4 inline-block rounded-lg bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400">MODO VOZ</span>
              <h3 class="mb-4 text-2xl font-bold text-white">Dicta mientras trabajas</h3>
              <p class="mb-8 text-slate-400 italic">"{{ data.ejemplo }}"</p>
              
              <div class="flex items-end gap-1 h-12">
                <div v-for="i in 30" :key="i" 
                     class="w-1 flex-1 bg-blue-500 rounded-full animate-wave" 
                     :style="{ animationDelay: `${i * 0.05}s`, height: `${Math.random() * 100}%` }">
                </div>
              </div>
            </div>
          </div>

          <div class="rounded-3xl border border-dashed border-slate-700 bg-slate-950 p-8 transition-colors hover:border-blue-500/50" data-aos="fade-up" data-aos-delay="100">
            <span class="mb-4 inline-block rounded-lg bg-slate-800 px-3 py-1 text-xs font-bold text-slate-400">MODO TEXTO</span>
            <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-2xl">⌨️</div>
            <h3 class="mb-2 text-xl font-bold text-white">¿Mucho ruido?</h3>
            <p class="text-sm leading-relaxed text-slate-500">Escribe una nota rápida como si fuera un WhatsApp. Nuestra IA le dará formato profesional.</p>
          </div>

          <div class="rounded-3xl border border-slate-800 bg-slate-900/50 p-8" data-aos="fade-up" data-aos-delay="200">
            <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-2xl">📄</div>
            <h3 class="mb-2 text-xl font-bold text-white">PDF Personalizado</h3>
            <p class="text-sm leading-relaxed text-slate-500">Añade tu logo y datos fiscales. Resultados que transmiten confianza a tus clientes.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="relative z-10 px-6 py-24 text-center">
      <div class="mx-auto max-w-4xl rounded-[3rem] bg-gradient-to-b from-slate-900 to-slate-950 p-12 border border-slate-800 shadow-2xl" data-aos="zoom-y-out">
        <h2 class="mb-6 text-3xl font-extrabold text-white sm:text-5xl">¿Empezamos con tu primer presupuesto?</h2>
        <p class="mb-10 text-lg text-slate-400">Regístrate en segundos con Google y recibe 1 crédito de regalo.</p>
        <NuxtLink to="/" class="inline-block rounded-xl bg-white px-10 py-4 text-lg font-bold text-black transition-transform hover:scale-105 active:scale-95">
          Probar Gratis Ahora
        </NuxtLink>
      </div>
    </section>


  </main>
  <footer class="bg-white pt-20 sm:pt-32 pb-12 border-t border-slate-100">
  <div class="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8 mb-20 text-balance">
    
    <div class="col-span-1 lg:col-span-2 text-center sm:text-left">
      <div class="flex items-center justify-center sm:justify-start gap-3 mb-6 sm:mb-8">
        <div class="w-8 h-8 sm:w-10 sm:h-10 bg-black rounded-xl flex items-center justify-center text-white font-black italic shadow-lg">P</div>
        <span class="text-xl sm:text-2xl font-black tracking-tighter italic uppercase">PresuVoz</span>
      </div>
      <p class="text-slate-400 font-bold max-w-sm text-base sm:text-lg leading-tight uppercase italic opacity-50 mx-auto sm:mx-0">
        Dedicado a los que construyen el mañana con sus propias manos.
      </p>
      <div class="mt-8 flex items-center justify-center sm:justify-start gap-2">
        <span class="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
        <span class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Sistema Operativo v3.1</span>
      </div>
    </div>

    <div class="text-center sm:text-left">
      <h5 class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-6 sm:mb-8 italic">Oficios I</h5>
      <ul class="space-y-3 sm:space-y-4 font-bold text-slate-500 text-[11px] uppercase tracking-widest">
        <li><NuxtLink to="/oficios/pintores" class="hover:text-black transition-colors">Pintores</NuxtLink></li>
        <li><NuxtLink to="/oficios/electricistas" class="hover:text-black transition-colors">Electricistas</NuxtLink></li>
        <li><NuxtLink to="/oficios/fontaneros" class="hover:text-black transition-colors">Fontaneros</NuxtLink></li>
        <li><NuxtLink to="/oficios/reformas-integrales" class="hover:text-black transition-colors">Reformas</NuxtLink></li>
        <li><NuxtLink to="/oficios/limpieza" class="hover:text-black transition-colors">Limpieza</NuxtLink></li>
        <li><NuxtLink to="/oficios/carpinteros" class="hover:text-black transition-colors">Carpinteros</NuxtLink></li>
        <li><NuxtLink to="/oficios/climatizacion" class="hover:text-black transition-colors">Climatización</NuxtLink></li>
      </ul>
    </div>

    <div class="text-center sm:text-left">
      <h5 class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-6 sm:mb-8 italic">Oficios II</h5>
      <ul class="space-y-3 sm:space-y-4 font-bold text-slate-500 text-[11px] uppercase tracking-widest">
        <li><NuxtLink to="/oficios/albaniles" class="hover:text-black transition-colors">Albañiles</NuxtLink></li>
        <li><NuxtLink to="/oficios/jardineros" class="hover:text-black transition-colors">Jardineros</NuxtLink></li>
        <li><NuxtLink to="/oficios/pladuristas" class="hover:text-black transition-colors">Pladuristas</NuxtLink></li>
        <li><NuxtLink to="/oficios/cerrajeros" class="hover:text-black transition-colors">Cerrajeros</NuxtLink></li>
        <li><NuxtLink to="/oficios/montadores-muebles" class="hover:text-black transition-colors">Montadores</NuxtLink></li>
        <li><NuxtLink to="/oficios/tecnicos-electrodomesticos" class="hover:text-black transition-colors">Reparaciones</NuxtLink></li>
      </ul>
    </div>

    <div class="text-center sm:text-left">
      <h5 class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-6 sm:mb-8 italic">Soporte & Legal</h5>
      <ul class="space-y-3 sm:space-y-4 font-bold text-slate-500 text-[11px] uppercase tracking-widest mb-8">
        <li><NuxtLink to="/legal/privacidad" class="hover:text-black">Privacidad</NuxtLink></li>
        <li><NuxtLink to="/legal/terminos" class="hover:text-black">Términos</NuxtLink></li>
        <li><NuxtLink to="/legal/aviso-legal" class="hover:text-black">Aviso Legal</NuxtLink></li>
      </ul>
      <a href="mailto:jcasoldev@gmail.com" class="text-indigo-600 font-black text-sm block hover:underline tracking-tighter uppercase italic">jcasoldev@gmail.com</a>
      <p class="text-slate-400 text-[10px] font-black uppercase mt-2 tracking-widest">España 🇪🇸</p>
    </div>

  </div>

  <div class="max-w-7xl mx-auto px-6 pt-12 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-8">
    <div class="flex items-center gap-6 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
      <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" class="h-4 sm:h-5" alt="Stripe">
    </div>
    <p class="text-[9px] sm:text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] sm:tracking-[0.4em] text-center">
      © 2026 PresuVoz AI • Built for makers.
    </p>
  </div>
</footer>
</template>

<style>
@keyframes wave {
  0%, 100% { height: 20%; }
  50% { height: 100%; }
}
.animate-wave {
  animation: wave 1.2s ease-in-out infinite;
}

/* AOS Clip-up Effect Custom */
[data-aos="clip-up"] {
  clip-path: inset(100% 0 0 0);
  transition: clip-path 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
[data-aos="clip-up"].aos-animate {
  clip-path: inset(0 0 0 0);
}
</style>