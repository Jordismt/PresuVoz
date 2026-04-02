<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '~/lib/supabase'
import { useUser } from '~/composable/useUser'
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { signInWithGoogle } from '~/lib/supabase'
// --- CONFIGURACIÓN DE STRIPE ---
const PRICE_ID_UNICO = 'price_1THMyXBzDH5mgeinAIX7sJTB'
const PRICE_ID_PRO = 'price_1THS8rBzDH5mgeink9B7w4lQ'

const { user, loadingUser } = useUser()
const email = ref('')
const password = ref('')
const esRegistro = ref(false)
const cargandoAuth = ref(false)
const profile = ref<any>(null)
const mostrarLanding = ref(true)
const registroExitoso = ref(false)
const grabando = ref(false)
const transcripcion = ref('')
const textoEnVivo = ref('')
const cargandoIA = ref(false)
const verConfig = ref(false)
const idPresupuestoSeleccionado = ref<string | null>(null)
let recognition: any = null 

interface Item { desc: string; cant: number; precio: number }
interface Presupuesto { cliente: string; items: Item[] }
const presupuesto = ref<Presupuesto | null>(null)
const listaPresupuestos = ref<any[]>([])

const configEmpresa = ref({
  nombre: 'Mi Empresa S.L.',
  nif: '',
  direccion: 'Calle Falsa 123, Madrid',
  ivaPorcentaje: 21,
  id: Math.floor(10000 + Math.random() * 90000),
  fecha: new Date().toLocaleDateString('es-ES')
})

const handleGoogleAuth = async () => {
  cargandoAuth.value = true
  try {
    const { error } = await signInWithGoogle()
    if (error) throw error
  } catch (error: any) {
    alert("Error al conectar con Google: " + error.message)
    cargandoAuth.value = false
  }
}

const fetchProfile = async () => {
  if (!user.value) return
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.value.id).single()
  if (!error) profile.value = data
}

const cargarHistorial = async () => {
  if (!user.value) return
  const { data, error } = await supabase
    .from('presupuestos')
    .select('*')
    .eq('user_id', user.value.id)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error("Error cargando historial:", error.message)
    return
  }
  listaPresupuestos.value = data || []
}

onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('success')) {
    mostrarLanding.value = false
    setTimeout(async () => {
      await fetchProfile()
      window.history.replaceState({}, document.title, "/")
    }, 2000)
  }
})

watch(user, (newUser) => {
  if (newUser) {
    fetchProfile()
    cargarHistorial()
  }
}, { immediate: true })

const handleAuth = async () => {
  cargandoAuth.value = true
  
  if (esRegistro.value) {
    const { data, error } = await supabase.auth.signUp({ email: email.value, password: password.value })
    if (error) {
      alert("Error: " + error.message)
    } else {
      // AQUÍ activamos la pantalla del sobre 📩
      registroExitoso.value = true
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email: email.value, password: password.value })
    if (error) alert("Error: " + error.message)
  }
  cargandoAuth.value = false
}

const logout = async () => {
  await supabase.auth.signOut()
  presupuesto.value = null
  profile.value = null
  mostrarLanding.value = true
}

const toggleGrabacion = () => {
  if (!process.client) return
  if (!recognition) {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return alert("Navegador no compatible")
    
    recognition = new SpeechRecognition()
    recognition.lang = 'es-ES'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (e: any) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          transcripcion.value += e.results[i][0].transcript
        } else {
          interim += e.results[i][0].transcript
        }
      }
      textoEnVivo.value = interim
    }
    
    recognition.onend = () => { 
      grabando.value = false 
      textoEnVivo.value = ''
    }
  }

  if (grabando.value) {
    recognition.stop()
  } else {
    textoEnVivo.value = ''
    recognition.start()
    grabando.value = true
  }
}

const generarConIA = async () => {
  if (!transcripcion.value) return
  cargandoIA.value = true
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/generar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify({ texto: transcripcion.value })
    })
    if (!res.ok) throw new Error((await res.json()).statusMessage || 'Error')
    presupuesto.value = await res.json()
    idPresupuestoSeleccionado.value = null
    await guardarEnDB()
    await fetchProfile()
  } catch (e: any) { alert("❌ " + e.message) }
  finally { cargandoIA.value = false }
}

const guardarEnDB = async () => {
  if (!presupuesto.value || !user.value) return
  const datosAGuardar: any = {
    user_id: user.value.id,
    cliente: presupuesto.value.cliente,
    items: presupuesto.value.items,
    total: calculos.value.total
  }
  if (idPresupuestoSeleccionado.value) {
    datosAGuardar.id = idPresupuestoSeleccionado.value
  }
  const { data, error } = await supabase
    .from('presupuestos')
    .upsert(datosAGuardar, { onConflict: 'id' })
    .select()

  if (error) {
    console.error("Error al guardar:", error.message)
  } else if (data && data[0]) {
    idPresupuestoSeleccionado.value = data[0].id
  }
  await cargarHistorial()
}

const seleccionarHistorial = (p: any) => {
  idPresupuestoSeleccionado.value = p.id
  presupuesto.value = { cliente: p.cliente, items: p.items }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const eliminarFila = (i: number) => presupuesto.value?.items.splice(i, 1)
const añadirFila = () => presupuesto.value?.items.push({ desc: 'Nuevo concepto', cant: 1, precio: 0 })

// --- LÓGICA DE GENERACIÓN DE PDF (UNIFICADA) ---

// Esta función solo se encarga del diseño y los datos
const prepararPDF = () => {
  if (!presupuesto.value) return null
  const doc = new jsPDF()
  const c = configEmpresa.value
  const p = presupuesto.value

  doc.setFontSize(18).setTextColor(79, 70, 229).text(c.nombre, 14, 20)
  doc.setFontSize(9).setTextColor(100).text(`${c.nif} | ${c.direccion}`, 14, 27)
  doc.setTextColor(0).text(`FECHA: ${c.fecha} | PRESUPUESTO #${c.id}`, 140, 20)
  doc.setFontSize(11).text(`CLIENTE: ${p.cliente}`, 14, 45)

  autoTable(doc, {
    startY: 50,
    head: [['Descripción', 'Cant.', 'Precio', 'Subtotal']],
    body: p.items.map(i => [i.desc, i.cant, `${i.precio}€`, `${(i.cant * i.precio).toFixed(2)}€`]),
    headStyles: { fillColor: [79, 70, 229] }
  })

  const finalY = (doc as any).lastAutoTable.finalY + 10
  doc.text(`Subtotal: ${formatCurrency(calculos.value.subtotal)}`, 140, finalY)
  doc.text(`IVA (${c.ivaPorcentaje}%): ${formatCurrency(calculos.value.iva)}`, 140, finalY + 7)
  doc.setFontSize(14).setFont("helvetica", "bold").text(`TOTAL: ${formatCurrency(calculos.value.total)}`, 140, finalY + 16)
  
  return doc
}

// Esta función solo descarga
const descargarPDF = () => {
  const doc = prepararPDF()
  if (doc) doc.save(`Presupuesto_${presupuesto.value?.cliente}.pdf`)
}

// Esta función abre el menú de compartir (WhatsApp, etc.)
const compartirPDF = async () => {
  const doc = prepararPDF()
  if (!doc || !presupuesto.value) return

  const pdfBlob = doc.output('blob')
  const nombreArchivo = `Presupuesto_${presupuesto.value.cliente.replace(/\s+/g, '_')}.pdf`
  const archivo = new File([pdfBlob], nombreArchivo, { type: 'application/pdf' })

  if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try {
      await navigator.share({
        files: [archivo],
        title: 'Presupuesto ' + presupuesto.value.cliente,
        text: `Hola ${presupuesto.value.cliente}, te adjunto el presupuesto solicitado.`
      })
    } catch (err) {
      // Si el usuario cancela, lo descargamos para que no se pierda el trabajo
      doc.save(nombreArchivo)
    }
  } else {
    doc.save(nombreArchivo)
    alert("PDF descargado. En ordenadores, adjúntalo manualmente a WhatsApp.")
  }
}


const iniciarPago = async (priceId: string, mode: 'payment' | 'subscription') => {
  // Solo bloqueamos si intenta suscribirse de nuevo al plan que ya tiene
  if (mode === 'subscription' && profile.value?.plan?.toLowerCase() === 'pro') {
    alert("Ya tienes activo el Plan PRO. Si necesitas más usos antes de que renueve tu mes, puedes adquirir 'Créditos puntuales'.");
    return;
  }

  const { data: { session } } = await supabase.auth.getSession()
  try {
    const data = await $fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session?.access_token}` },
      body: { priceId, mode }
    })
    if (data?.url) window.location.href = data.url
  } catch (err: any) {
    alert("❌ " + (err.data?.message || "Error al conectar con Stripe"))
  }
}

const abrirPortalGestion = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  try {
    const data = await $fetch('/api/stripe/portal', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session?.access_token}` }
    })
    if (data?.url) window.location.href = data.url
  } catch (err: any) {
    alert("❌ " + (err.data?.message || "Error al abrir el portal de gestión"))
  }
}

const formatCurrency = (v: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)
const calculos = computed(() => {
  if (!presupuesto.value) return { subtotal: 0, iva: 0, total: 0 }
  const subtotal = presupuesto.value.items.reduce((acc, i) => acc + i.cant * i.precio, 0)
  const iva = subtotal * (configEmpresa.value.ivaPorcentaje / 100)
  return { subtotal, iva, total: subtotal + iva }
})



const eliminarPresupuesto = async (id: string) => {
  if (!confirm("¿Seguro que quieres borrar este presupuesto?")) return

  const { error } = await supabase
    .from('presupuestos')
    .delete()
    .eq('id', id)

  if (error) {
    alert("Error al eliminar: " + error.message)
  } else {
    // Si el presupuesto que estamos borrando es el que está abierto, lo cerramos
    if (idPresupuestoSeleccionado.value === id) {
      presupuesto.value = null
      idPresupuestoSeleccionado.value = null
    }
    await cargarHistorial()
  }
}

const limpiarTodoElHistorial = async () => {
  if (!user.value) return
  if (!confirm("⚠️ ¿Estás seguro? Se borrarán TODOS tus presupuestos guardados de forma permanente.")) return

  const { error } = await supabase
    .from('presupuestos')
    .delete()
    .eq('user_id', user.value.id)

  if (error) {
    alert("Error: " + error.message)
  } else {
    presupuesto.value = null
    idPresupuestoSeleccionado.value = null
    await cargarHistorial()
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#f1f5f9] text-slate-900 font-sans">
    
    <div v-if="loadingUser" class="fixed inset-0 bg-white z-50 flex items-center justify-center">
      <div class="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div v-else-if="!user">
      
<div v-if="mostrarLanding" class="min-h-screen bg-white selection:bg-indigo-600 selection:text-white text-slate-900 overflow-x-hidden antialiased">
  
  <component :is="'script'" type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "PresuVoz AI",
      "operatingSystem": "Web",
      "applicationCategory": "BusinessApplication",
      "offers": {
        "@type": "AggregateOffer",
        "lowPrice": "0",
        "priceCurrency": "EUR"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "reviewCount": "1240"
      }
    }
  </component>

  <nav class="fixed top-0 z-[100] w-full bg-white/80 backdrop-blur-xl border-b border-slate-100">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex justify-between items-center">
      <div class="flex items-center gap-2 sm:gap-3 group cursor-pointer" @click="window.scrollTo({top: 0, behavior: 'smooth'})">
        <div class="w-8 h-8 sm:w-10 sm:h-10 bg-black rounded-xl flex items-center justify-center text-white font-black italic shadow-2xl group-hover:bg-indigo-600 transition-all duration-500 text-sm sm:text-base">P</div>
        <span class="text-xl sm:text-2xl font-black tracking-tighter uppercase italic">PresuVoz</span>
      </div>
      <div class="flex items-center gap-3 sm:gap-8">
        <button @click="mostrarLanding = false; esRegistro = false" class="hidden sm:block text-sm font-bold text-slate-500 hover:text-black transition-colors">Entrar</button>
        <button @click="mostrarLanding = false; esRegistro = true" class="px-4 sm:px-8 py-2.5 sm:py-3 bg-black text-white rounded-full text-xs sm:text-sm font-black hover:bg-indigo-600 transition-all shadow-xl active:scale-95">
          Empezar Gratis
        </button>
      </div>
    </div>
  </nav>

  <header class="relative pt-32 sm:pt-48 pb-20 sm:pb-32 overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-white to-white">
    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-30">
      <div class="absolute top-0 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-indigo-300 rounded-full blur-[80px] sm:blur-[120px]"></div>
      <div class="absolute bottom-0 right-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-violet-300 rounded-full blur-[80px] sm:blur-[120px]"></div>
    </div>

    <div class="max-w-7xl mx-auto px-6 text-center relative z-10">
      <div class="inline-flex items-center gap-3 bg-white border border-slate-200 p-1 pr-4 rounded-full mb-8 sm:mb-12 shadow-sm">
        <span class="bg-indigo-600 text-white text-[9px] sm:text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-tighter">Dual Input</span>
        <span class="text-[9px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-[0.1em] sm:tracking-[0.2em]">Dicta o Escribe. La IA genera el PDF.</span>
      </div>
      
<h1 class="text-4xl sm:text-6xl md:text-[90px] lg:text-[100px] font-black tracking-[-0.05em] mb-8 sm:mb-10 leading-[0.9] sm:leading-[0.85] text-slate-900 text-balance">
  Envia presupuestos <span class="text-indigo-600">en 30 segundos</span> <br class="hidden sm:block">
  <span class="italic font-serif opacity-90">y consigue más clientes</span>
</h1>

<p class="max-w-3xl mx-auto text-lg sm:text-xl md:text-2xl text-slate-500 font-medium mb-12 sm:mb-16 leading-relaxed text-balance px-4">
Para fontaneros, electricistas y reformistas que quieren responder más rápido y cerrar más trabajos. 
  Habla o escribe y obtén un presupuesto profesional listo para enviar por WhatsApp en 30 segundos.
</p>
      
      <div class="flex flex-col items-center gap-8 sm:gap-10">
        <button @click="mostrarLanding = false; esRegistro = true" class="group relative w-full sm:w-auto px-8 sm:px-16 py-6 sm:py-8 bg-black text-white rounded-2xl sm:rounded-3xl font-black text-xl sm:text-2xl shadow-2xl hover:bg-indigo-600 transition-all active:scale-95 overflow-hidden">
          <span class="relative z-10">Empezar PresuVoz Gratis 🚀</span>
          <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        </button>
        
        <div class="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <div class="flex -space-x-3">
             <img v-for="i in 4" :key="i" :src="`https://i.pravatar.cc/100?img=${i+30}`" class="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-4 border-white shadow-lg" />
          </div>
          <div class="text-center sm:text-left">
            <p class="text-sm font-black text-slate-900">+100 autónomos</p>
            <p class="text-xs font-bold text-slate-400 italic">Ahorran 15 horas de oficina al mes</p>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-6xl mx-auto mt-20 sm:mt-32 px-4 sm:px-6 relative">
      <div class="absolute -top-10 sm:-top-20 left-1/2 -translate-x-1/2 w-[110%] h-[300px] sm:h-[500px] bg-indigo-600/5 blur-[60px] sm:blur-[120px] rounded-full -z-10"></div>
      <div class="bg-slate-900 rounded-[2.5rem] sm:rounded-[4rem] p-2 sm:p-4 shadow-2xl border border-slate-800 relative">
        
        <div class="absolute -top-8 -left-8 bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 hidden lg:block">
           <div class="flex items-center gap-3">
              <div class="text-4xl">🎙️</div>
              <div class="text-4xl text-slate-200">/</div>
              <div class="text-4xl">✍️</div>
           </div>
           <p class="mt-3 text-[10px] font-black uppercase text-indigo-600 tracking-widest text-center">Tú eliges cómo</p>
        </div>

        <div class="bg-white rounded-[2rem] sm:rounded-[3rem] overflow-hidden border border-slate-200 flex flex-col lg:flex-row min-h-[500px] sm:min-h-[600px]">
          <aside class="w-full lg:w-[350px] bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-100 p-8 sm:p-10 space-y-8 sm:space-y-10 text-left">
            <div>
              <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paso 1: Tu borrador</span>
              <h4 class="text-xl font-black text-slate-900 mt-2 italic leading-tight">Escribe o Dicta <br class="hidden sm:block">de forma natural</h4>
            </div>

            <div class="space-y-4">
               <div class="p-5 bg-white rounded-2xl border-2 border-dashed border-indigo-100 italic text-slate-400 text-[11px] sm:text-xs">
                  "Ej: Caldera Junkers 800€, Mano de obra 4h a 35€/h..."
               </div>
               <p class="text-center text-[10px] font-bold text-slate-400 uppercase">O simplemente hablas</p>
               <div class="w-full h-16 sm:h-20 bg-indigo-600 rounded-2xl sm:rounded-3xl flex items-center justify-center text-white text-2xl sm:text-3xl shadow-lg shadow-indigo-100 cursor-pointer">
                  🎙️
               </div>
               <p class="text-[9px] text-center text-indigo-400 font-bold uppercase tracking-widest animate-pulse">Púlsalo y describe el trabajo</p>
            </div>
          </aside>

          <main class="flex-1 p-6 sm:p-10 md:p-16 text-left relative bg-white">
            <div class="flex flex-col sm:flex-row justify-between items-start gap-4 mb-10 sm:mb-16">
              <div>
                <span class="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Paso 2: Resultado IA</span>
                <h3 class="text-2xl sm:text-3xl font-black text-slate-900 mt-2 tracking-tighter">Presupuesto #2026-88</h3>
              </div>
              <div class="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-wider">PDF generado</div>
            </div>
            
            <div class="space-y-6 sm:space-y-8 overflow-x-auto">
              <div class="min-w-[400px]">
                <div class="grid grid-cols-4 border-b border-slate-100 pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <div class="col-span-2">Concepto</div>
                  <div class="text-center">Cant.</div>
                  <div class="text-right">Total</div>
                </div>
                <div class="grid grid-cols-4 font-bold text-slate-800 border-b border-slate-50 py-4 sm:py-6 items-center text-sm sm:text-base">
                  <div class="col-span-2">Caldera Junkers Eurosmart</div>
                  <div class="text-center text-slate-400 font-medium">1 ud</div>
                  <div class="text-right font-black italic">800,00€</div>
                </div>
                <div class="grid grid-cols-4 font-bold text-slate-800 border-b border-slate-50 py-4 sm:py-6 items-center text-sm sm:text-base">
                  <div class="col-span-2">Mano de obra especializada</div>
                  <div class="text-center text-slate-400 font-medium">4h</div>
                  <div class="text-right font-black italic">140,00€</div>
                </div>
              </div>
            </div>

            <div class="mt-12 sm:mt-20 flex justify-end">
              <div class="text-right p-4 sm:p-6 bg-slate-50 rounded-2xl sm:rounded-3xl border border-slate-100">
                <p class="text-[9px] font-black text-slate-400 uppercase mb-1 sm:mb-2 tracking-widest">Total (IVA incl.)</p>
                <p class="text-4xl sm:text-6xl font-black tracking-tighter text-indigo-600">1.137,40€</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  </header>

  <section class="py-20 sm:py-32 bg-slate-900 text-white overflow-hidden relative">
    <div class="max-w-7xl mx-auto px-6 relative z-10">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">
        <div>
          <h2 class="text-4xl sm:text-5xl font-black tracking-tighter mb-8 sm:mb-12 leading-none text-balance text-center lg:text-left">
            Deja de ser un <br><span class="text-indigo-400 italic">esclavo del papel.</span>
          </h2>
          <div class="space-y-6 sm:space-y-8">
            <div class="flex flex-col sm:flex-row gap-4 sm:gap-6 p-6 rounded-3xl bg-white/5 border border-white/10">
              <div class="text-3xl">📝</div>
              <div>
                <h4 class="font-black text-lg mb-1 italic">El método antiguo</h4>
                <p class="text-slate-400 text-sm">Llegar a casa cansado, buscar el bloc, encender el PC y pelearte con Excel. 2 horas perdidas.</p>
              </div>
            </div>
            <div class="flex flex-col sm:flex-row gap-4 sm:gap-6 p-6 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 shadow-2xl">
              <div class="text-3xl">🎙️</div>
              <div>
                <h4 class="font-black text-lg mb-1 italic">El método PresuVoz</h4>
                <p class="text-slate-100 text-sm font-medium">Acabas la obra, dictas 20 segundos y envías el PDF por WhatsApp. 0 minutos perdidos.</p>
              </div>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3 sm:gap-4">
          <div v-for="stat in [{n:'30s', t:'Creación'}, {n:'100%', t:'Precisión'}, {n:'+15h', t:'Tiempo libre'}, {n:'A+', t:'Imagen Pro'}]" :key="stat.t" class="p-6 sm:p-10 bg-white/5 border border-white/10 rounded-2xl sm:rounded-[2.5rem] text-center">
            <p class="text-3xl sm:text-4xl font-black text-indigo-400 mb-1 sm:mb-2 tracking-tighter">{{stat.n}}</p>
            <p class="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500">{{stat.t}}</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="py-20 sm:py-40 bg-white">
    <div class="max-w-5xl mx-auto px-6 text-center">
      <div class="mb-16 sm:mb-24">
        <h2 class="text-xs sm:text-sm font-black text-indigo-600 uppercase tracking-[0.3em] sm:tracking-[0.4em] mb-4">Precios sin letra pequeña</h2>
        <p class="text-4xl sm:text-6xl font-black tracking-tighter text-slate-900 leading-[1.1] sm:leading-none">Mismas funciones. <br>Diferente volumen.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10 items-stretch max-w-4xl mx-auto">
        <div class="p-8 sm:p-12 bg-white rounded-[2.5rem] sm:rounded-[3.5rem] border-2 border-slate-100 flex flex-col justify-between hover:border-indigo-600/20 hover:shadow-2xl transition-all duration-500 group relative">
          <div class="text-left">
            <span class="inline-block px-4 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest mb-6 sm:mb-8">Ocasional</span>
            <h4 class="text-2xl sm:text-3xl font-black mb-2 italic">1 Crédito</h4>
            <p class="text-slate-500 text-sm mb-8 sm:mb-10 leading-relaxed font-medium italic">"Solo necesito este presupuesto ahora mismo".</p>
            
            <div class="flex items-baseline gap-2 mb-10 sm:mb-12">
              <span class="text-6xl sm:text-7xl font-black tracking-tighter text-slate-900">1,59€</span>
              <span class="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest">/ total</span>
            </div>

            <ul class="space-y-4 mb-10 sm:mb-12 text-xs sm:text-[13px] font-bold text-slate-700">
              <li class="flex items-center gap-3">
                <div class="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px]">✓</div>
                Historial completo guardado
              </li>
              <li class="flex items-center gap-3">
                <div class="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px]">✓</div>
                Envío directo por WhatsApp
              </li>
              <li class="flex items-center gap-3">
                <div class="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px]">✓</div>
                PDF con tus datos fiscales
              </li>
            </ul>
          </div>
          <button @click="mostrarLanding = false; esRegistro = true" class="w-full py-5 sm:py-6 rounded-2xl sm:rounded-3xl bg-slate-50 text-slate-900 font-black hover:bg-black hover:text-white transition-all uppercase text-[10px] sm:text-xs tracking-widest border border-slate-200">Comprar 1 Crédito</button>
        </div>

        <div class="p-8 sm:p-12 bg-slate-900 rounded-[2.5rem] sm:rounded-[3.5rem] text-white relative flex flex-col justify-between shadow-2xl md:scale-105 z-10 overflow-hidden border border-indigo-500/30">
          <div class="absolute top-0 right-0 bg-indigo-600 px-6 sm:px-8 py-2 sm:py-3 rounded-bl-2xl sm:rounded-bl-[2rem] text-[9px] sm:text-[11px] font-black uppercase tracking-widest shadow-2xl animate-pulse">
            Ahorras 30€ al mes
          </div>
          
          <div class="text-left">
            <span class="inline-block px-4 py-1 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-6 sm:mb-8">Profesional</span>
            <h4 class="text-3xl sm:text-4xl font-black mb-2 italic">25 Créditos</h4>
            <p class="text-slate-400 text-sm mb-8 sm:mb-10 leading-relaxed font-medium italic">Para los que no paran de cerrar clientes.</p>
            
            <div class="flex items-baseline gap-2 mb-10 sm:mb-12">
              <span class="text-7xl sm:text-8xl font-black tracking-tighter text-white">9,99€</span>
              <span class="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-widest">/ mes</span>
            </div>

            <ul class="space-y-4 mb-10 sm:mb-12 text-xs sm:text-[13px] font-bold">
              <li class="flex items-center gap-3">
                <div class="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px]">★</div>
                Cada presupuesto a <span class="text-indigo-400 italic">0,40€</span>
              </li>
              <li class="flex items-center gap-3 text-indigo-100">
                <div class="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px]">★</div>
                Renovación automática
              </li>
              <li class="flex items-center gap-3">
                <div class="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px]">★</div>
                Incluye todas las funciones Pro
              </li>
            </ul>
          </div>
          
          <button @click="mostrarLanding = false; esRegistro = true" class="w-full py-6 sm:py-7 rounded-2xl sm:rounded-3xl bg-indigo-600 text-white font-black hover:bg-indigo-500 transition-all uppercase text-[10px] sm:text-xs tracking-widest shadow-xl active:scale-95">
            Activar Plan Mensual
          </button>
        </div>
      </div>
      
      <div class="mt-16 sm:mt-20 inline-flex items-center gap-3 sm:gap-4 px-5 py-2.5 bg-slate-50 rounded-2xl border border-slate-100">
        <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" class="h-3.5 sm:h-4 opacity-40" alt="Stripe">
        <span class="h-4 w-[1px] bg-slate-200"></span>
        <p class="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Pago seguro por Stripe</p>
      </div>
    </div>
  </section>

  <section class="py-20 sm:py-32 bg-slate-50 border-t border-slate-100">
    <div class="max-w-4xl mx-auto px-6">
      <h2 class="text-3xl sm:text-4xl font-black text-center mb-12 sm:mb-20 tracking-tighter">Lo que todos preguntan</h2>
      <div class="space-y-4 sm:space-y-6">
        <div v-for="faq in [
          {q:'¿Entiende catalán o acentos?', a:'Nuestra IA entiende perfectamente el castellano, catalán y diversos acentos regionales sin problemas.'},
          {q:'¿Puedo cancelar la suscripción?', a:'Sí, en cualquier momento con un solo clic desde tu panel. Sin permanencias.'},
          {q:'¿Cómo recibo los presupuestos?', a:'Se generan en PDF profesional. Puedes enviarlos por WhatsApp, Email o descargarlos al instante.'}
        ]" :key="faq.q" class="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200">
          <h4 class="font-black text-base sm:text-lg mb-2 sm:mb-3 tracking-tight italic">{{faq.q}}</h4>
          <p class="text-slate-500 text-xs sm:text-sm font-medium leading-relaxed">{{faq.a}}</p>
        </div>
      </div>
    </div>
  </section>

  <footer class="bg-white pt-20 sm:pt-32 pb-12 border-t border-slate-100">
    <div class="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16 mb-20 text-balance">
      <div class="col-span-1 lg:col-span-2 text-center sm:text-left">
        <div class="flex items-center justify-center sm:justify-start gap-3 mb-6 sm:mb-8">
          <div class="w-8 h-8 sm:w-10 sm:h-10 bg-black rounded-xl flex items-center justify-center text-white font-black italic">P</div>
          <span class="text-xl sm:text-2xl font-black tracking-tighter italic uppercase">PresuVoz</span>
        </div>
        <p class="text-slate-400 font-bold max-w-sm text-base sm:text-lg leading-tight uppercase italic opacity-50 mx-auto sm:mx-0">
          Dedicado a los que construyen el mañana con sus propias manos.
        </p>
      </div>
      <div class="text-center sm:text-left">
        <h5 class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-6 sm:mb-8">Soporte Directo</h5>
        <a href="mailto:jcasoldev@gmail.com" class="text-indigo-600 font-black text-sm block hover:underline">jcasoldev@gmail.com</a>
        <p class="text-slate-400 text-[10px] font-black uppercase mt-2 tracking-widest">España 🇪🇸</p>
      </div>
      <div class="text-center sm:text-left">
        <h5 class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-6 sm:mb-8">Legal</h5>
        <ul class="space-y-3 sm:space-y-4 font-bold text-slate-500 text-[11px] uppercase tracking-widest">
          <li><NuxtLink to="/legal/privacidad" class="hover:text-black">Privacidad</NuxtLink></li>
          <li><NuxtLink to="/legal/terminos" class="hover:text-black">Términos</NuxtLink></li>
          <li><NuxtLink to="/legal/aviso-legal" class="hover:text-black">Aviso Legal</NuxtLink></li>
        </ul>
      </div>
    </div>
    <div class="max-w-7xl mx-auto px-6 pt-12 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-8">
      <div class="flex items-center gap-6 opacity-30 grayscale">
        <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" class="h-4 sm:h-5" alt="Stripe">
      </div>
      <p class="text-[9px] sm:text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] sm:tracking-[0.4em] text-center">
        © 2026 PresuVoz AI • Built for makers.
      </p>
    </div>
  </footer>
</div>


      <div v-else class="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-indigo-50 via-white to-slate-100 relative">
        <button @click="mostrarLanding = true" class="absolute top-8 left-8 text-slate-400 hover:text-indigo-600 font-bold flex items-center gap-2 transition-colors">
          ← Volver
        </button>

        <div class="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-md border border-white relative overflow-hidden">
          
          <div v-if="registroExitoso" class="text-center py-6 animate-in zoom-in duration-300">
            <div class="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">📩</div>
            <h2 class="text-2xl font-black text-slate-800 mb-4">¡Casi listo!</h2>
            <p class="text-slate-500 font-medium leading-relaxed">
              Hemos enviado un enlace de confirmación a <br>
              <span class="text-indigo-600 font-bold">{{ email }}</span>.
            </p>
            <div class="mt-6 text-sm bg-amber-50 text-amber-700 p-4 rounded-2xl font-medium text-left">
              ⚠️ <strong>Importante:</strong> Debes pulsar el botón que hay dentro del correo para activar tu cuenta. Si no te llega, mira en <strong>Spam</strong>.
            </div>
            <button @click="registroExitoso = false; esRegistro = false" class="mt-8 text-indigo-600 font-black uppercase text-[10px] tracking-widest hover:underline">
              Ir al Inicio de Sesión →
            </button>
          </div>

          <div v-else>
            <div class="text-center mb-10">
              <div :class="esRegistro ? 'bg-indigo-600' : 'bg-slate-800'" class="inline-block px-4 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-[0.2em] mb-6 shadow-sm">
                {{ esRegistro ? 'Nuevo Usuario' : 'Acceso Clientes' }}
              </div>
              
              <div class="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-3xl font-black mx-auto mb-4 shadow-lg shadow-indigo-100 transform -rotate-3">P</div>
              <h1 class="text-3xl font-extrabold tracking-tight">
                {{ esRegistro ? 'Crea tu cuenta' : '¡Hola de nuevo!' }}
              </h1>
            </div>

            <div class="space-y-4">
              <input v-model="email" type="email" placeholder="Correo electrónico" class="w-full p-5 rounded-2xl bg-slate-50 border-2 border-transparent outline-none focus:border-indigo-500 transition-all focus:bg-white font-medium" />
              <input v-model="password" type="password" placeholder="Tu contraseña" class="w-full p-5 rounded-2xl bg-slate-50 border-2 border-transparent outline-none focus:border-indigo-500 transition-all focus:bg-white font-medium" />
              
              <button @click="handleAuth" :disabled="cargandoAuth" 
                :class="esRegistro ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' : 'bg-slate-900 hover:bg-black shadow-slate-200'"
                class="w-full text-white p-5 rounded-2xl font-bold shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3">
                <span v-if="cargandoAuth" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>{{ esRegistro ? 'Empezar ahora gratis' : 'Entrar en PresuVoz' }}</span>
              </button>

              <button @click="esRegistro = !esRegistro" class="w-full text-center text-sm font-bold text-slate-400 hover:text-indigo-600 transition-colors mt-2">
                {{ esRegistro ? '¿Ya tienes cuenta? Inicia sesión aquí' : '¿No tienes cuenta? Crea una gratis' }}
              </button>
            </div>
            <button 
  type="button"
  @click="handleGoogleAuth" 
  :disabled="cargandoAuth"
  class="w-full flex items-center justify-center gap-3 p-5 rounded-2xl bg-white border-2 border-slate-100 hover:border-indigo-600 hover:bg-slate-50 transition-all active:scale-[0.98] shadow-sm group"
>
  <img v-if="!cargandoAuth" src="https://www.svgrepo.com/show/475656/google-color.svg" class="w-6 h-6 group-hover:scale-110 transition-transform" alt="Google">
  <span v-else class="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
  <span class="text-slate-700 font-bold tracking-tight">
    {{ esRegistro ? 'Registrarse con Google' : 'Entrar con Google' }}
  </span>
</button>

<div class="relative flex py-2 items-center">
  <div class="flex-grow border-t border-slate-100"></div>
  <span class="flex-shrink mx-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">o con tu email</span>
  <div class="flex-grow border-t border-slate-100"></div>
</div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="max-w-6xl mx-auto p-4 md:p-8 pb-32">
<header class="flex flex-col md:flex-row justify-between items-center gap-6 mb-12 bg-white/50 backdrop-blur-md p-6 rounded-[2.5rem] border border-white shadow-sm">
        
        <div class="flex items-center gap-4 w-full md:w-auto">
          <div class="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black italic shadow-lg shadow-indigo-200 shrink-0 transform -rotate-3">
            P
          </div>
          
          <div class="flex flex-col">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-black text-indigo-500 uppercase tracking-[0.15em] bg-indigo-50 px-2 py-0.5 rounded-md">
                {{ profile?.plan || 'Free' }}
              </span>
              <span class="text-sm font-bold text-slate-500 capitalize italic">
                ¡Hola, {{ user?.email?.split('@')[0] }}! 👋
              </span>
            </div>
            
            <h2 class="text-2xl font-black tracking-tighter uppercase italic leading-none mt-1">
              PresuVoz <span class="text-indigo-600">Pro</span>
            </h2>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between md:justify-end gap-3 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
          
          <div v-if="profile" class="flex items-center gap-3 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-lg shadow-slate-200">
            <div class="relative">
              <div class="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
              <div class="absolute inset-0 h-2 w-2 rounded-full bg-green-400 blur-[3px]"></div>
            </div>
            <p class="text-[11px] font-black uppercase tracking-widest">
              {{ profile.requests_limit - profile.requests_used }} <span class="text-slate-400">Créditos</span>
            </p>
          </div>

          <div class="flex gap-2">
            <button @click="verConfig = true" 
              class="w-11 h-11 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all group" 
              title="Configuración">
              <span class="text-xl group-hover:rotate-45 transition-transform duration-300">⚙️</span>
            </button>
            
            <button @click="logout" 
              class="px-5 h-11 bg-red-50 rounded-xl border border-red-100 text-red-500 text-xs font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-95">
              Salir
            </button>
          </div>
        </div>
      </header>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div class="lg:col-span-4 space-y-6">
          <div class="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200/60 relative overflow-hidden">
            
            <div class="flex items-center justify-between mb-6">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Instrucciones del presupuesto</label>
              <button v-if="transcripcion" @click="transcripcion = ''; textoEnVivo = ''" class="text-[10px] font-bold text-red-400 hover:text-red-600 transition-colors uppercase tracking-widest">
                Borrar ×
              </button>
            </div>

            <div class="relative group">
              <textarea 
                v-model="transcripcion"
                placeholder='Ej: "Presupuesto para Juan, instalar 4 enchufes a 50€ cada uno..."'
                class="w-full min-h-[220px] bg-slate-50/50 rounded-[2rem] p-6 text-sm font-medium text-slate-600 leading-relaxed border-2 border-dashed border-slate-100 focus:border-indigo-500 focus:bg-white focus:ring-0 outline-none transition-all resize-none italic"
              ></textarea>
              
              <div v-if="textoEnVivo" class="absolute bottom-20 left-6 right-6 bg-white/90 backdrop-blur-sm p-3 rounded-2xl border border-indigo-100 shadow-sm animate-pulse pointer-events-none">
                <p class="text-[11px] font-bold text-indigo-500 italic leading-tight">
                  <span class="opacity-50 uppercase text-[9px] block mb-1">Escuchando...</span>
                  "{{ textoEnVivo }}"
                </p>
              </div>

              <div v-if="grabando" class="absolute bottom-4 right-6 flex items-center gap-2 bg-red-50 text-red-500 px-3 py-1.5 rounded-full border border-red-100">
                <span class="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                <span class="text-[10px] font-black uppercase tracking-tighter">Micro Activo</span>
              </div>
            </div>

            <div class="grid grid-cols-5 gap-3 mt-6">
              <button 
                @click="toggleGrabacion" 
                :class="grabando ? 'bg-red-500 shadow-red-200 ring-4 ring-red-50 text-white' : 'bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'" 
                class="col-span-1 h-16 rounded-2xl flex items-center justify-center transition-all active:scale-95"
                title="Dictar por voz"
              >
                <span class="text-2xl">{{ grabando ? '⏹' : '🎙️' }}</span>
              </button>

              <button 
                @click="generarConIA" 
                :disabled="cargandoIA || !transcripcion || (profile?.requests_used >= profile?.requests_limit)" 
                :class="(profile?.requests_used >= profile?.requests_limit) ? 'bg-slate-300' : 'bg-slate-900 hover:bg-black active:scale-[0.98]'"
                class="col-span-4 h-16 text-white rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-xl shadow-slate-200"
              >
                <span v-if="!cargandoIA" class="flex items-center gap-2">
                  ✨ <span>Generar presupuesto</span>
                </span>
                <span v-else class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              </button>
            </div>

            <p v-if="profile?.requests_used >= profile?.requests_limit" class="text-center text-[10px] text-red-500 font-bold mt-4 uppercase tracking-tighter">
              ⚠️ Créditos agotados. Recarga para continuar.
            </p>
          </div>

<div class="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-xl shadow-indigo-200">
  <h4 class="text-xs font-black uppercase tracking-widest opacity-70 mb-6">Recargar Energía</h4>
  <div class="space-y-3">
    <button @click="iniciarPago(PRICE_ID_UNICO, 'payment')" 
      class="w-full flex justify-between items-center p-5 bg-white/10 rounded-2xl hover:bg-white/20 transition-all border border-white/10 group shadow-sm">
      <div class="text-left">
        <span class="font-bold block">1 Crédito puntual</span>
        <span class="text-[10px] opacity-60 uppercase font-black">Uso inmediato</span>
      </div>
      <span class="bg-white text-indigo-600 px-3 py-1 rounded-lg font-black text-xs">1,59€</span>
    </button>

    <button @click="iniciarPago(PRICE_ID_PRO, 'subscription')" 
      :disabled="profile?.plan?.toLowerCase() === 'pro'"
      :class="profile?.plan?.toLowerCase() === 'pro' ? 'bg-indigo-500/50 cursor-default border border-white/10' : 'bg-white hover:shadow-lg'"
      class="w-full flex justify-between items-center p-5 rounded-2xl transition-all group">
      <div class="text-left">
        <span class="font-bold" :class="profile?.plan?.toLowerCase() === 'pro' ? 'text-white/90' : 'text-indigo-900'">
          {{ profile?.plan?.toLowerCase() === 'pro' ? 'Suscripción PRO Activa' : 'Plan PRO Mensual' }}
        </span>
        <span v-if="profile?.plan?.toLowerCase() !== 'pro'" class="text-[10px] text-indigo-400 block font-black uppercase">30 usos / mes</span>
      </div>
      <span v-if="profile?.plan?.toLowerCase() !== 'pro'" class="bg-indigo-600 text-white px-3 py-1 rounded-lg font-black text-xs">9,99€</span>
      <span v-else class="text-white text-lg">⭐</span>
    </button>
  </div>

  <button v-if="profile?.plan?.toLowerCase() === 'pro'" @click="abrirPortalGestion" 
    class="w-full mt-6 text-center text-[10px] font-black uppercase tracking-widest bg-white/5 py-2 rounded-xl border border-white/5 hover:bg-white/10 transition-all">
    ⚙️ Gestionar mi suscripción
  </button>
</div>
        </div>

        <div class="lg:col-span-8">
          <div v-if="presupuesto" class="bg-white rounded-[3.5rem] shadow-2xl shadow-slate-200/50 overflow-hidden border border-white animate-in fade-in duration-500">
            <div class="p-10 border-b border-slate-50 bg-slate-50/50 flex justify-between items-start">
              <div>
                <h4 class="text-2xl font-black italic tracking-tighter text-slate-800">{{ configEmpresa.nombre }}</h4>
                <p class="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">{{ configEmpresa.nif }} | {{ configEmpresa.direccion }}</p>
              </div>
              <div class="text-right">
                <div class="inline-block bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black uppercase mb-1">Borrador Oficial</div>
                <p class="text-xs font-bold text-slate-400">#{{ configEmpresa.id }} • {{ configEmpresa.fecha }}</p>
              </div>
            </div>

            <div class="p-10">
              <div class="mb-10 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-2">Nombre del Cliente</label>
                <input v-model="presupuesto.cliente" class="w-full text-2xl font-black bg-transparent border-none outline-none focus:text-indigo-600 transition-colors" />
              </div>
              
              <div class="overflow-x-auto">
                <table class="w-full text-left mb-6">
                  <thead>
                    <tr class="text-[10px] font-black text-slate-300 uppercase tracking-widest border-b border-slate-100">
                      <th class="pb-4 pl-2">Descripción</th>
                      <th class="pb-4 text-center w-20">Cant.</th>
                      <th class="pb-4 text-right w-32">Precio</th>
                      <th class="pb-4 w-12"></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-50">
                    <tr v-for="(item, i) in presupuesto.items" :key="i" class="group hover:bg-slate-50/50 transition-colors">
                      <td class="py-5 pl-2 font-bold text-slate-700">
                        <input v-model="item.desc" class="w-full bg-transparent outline-none focus:text-indigo-600" />
                      </td>
                      <td class="py-5 text-center">
                        <input v-model.number="item.cant" type="number" class="w-12 bg-transparent text-center font-bold text-slate-400 outline-none" />
                      </td>
                      <td class="py-5 text-right font-black text-slate-800">
                        <input v-model.number="item.precio" type="number" class="w-24 bg-transparent text-right outline-none focus:text-indigo-600" />
                      </td>
                      <td class="py-5 text-center">
                        <button @click="eliminarFila(i)" class="text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">✕</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="flex justify-between items-center mt-6 pt-6 border-t border-slate-100">
                <button @click="añadirFila" class="px-6 py-3 bg-slate-100 rounded-xl text-[11px] font-black text-slate-500 hover:bg-indigo-600 hover:text-white transition-all tracking-widest uppercase">+ Concepto</button>
                <div class="text-right">
                  <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest">Total (IVA inc.)</p>
                  <p class="text-4xl font-black text-indigo-600 tracking-tighter">{{ formatCurrency(calculos.total) }}</p>
                </div>
              </div>

              <div class="flex flex-col md:flex-row gap-4 mt-12">
  <button @click="descargarPDF" 
    class="flex-1 bg-slate-100 text-slate-600 p-6 rounded-3xl font-black text-lg hover:bg-slate-200 transition-all flex items-center justify-center gap-3">
    <span>📥</span> Descargar
  </button>

  <button @click="compartirPDF" 
    class="flex-[2] bg-indigo-600 text-white p-6 rounded-3xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
    <span>🚀</span> Generar y Enviar
  </button>
</div>
            </div>
          </div>

          <div v-else class="h-[600px] bg-white rounded-[3.5rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center p-12 text-center">
            <div class="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-4xl mb-6 grayscale opacity-50">📄</div>
            <h3 class="text-2xl font-black text-slate-300 tracking-tighter uppercase">Esperando instrucciones...</h3>
            <p class="max-w-xs text-sm font-medium text-slate-400 mt-3 leading-relaxed">Describe los trabajos escribiendo arriba o pulsando el micrófono.</p>
          </div>

<div v-if="listaPresupuestos.length" class="mt-16">
  <div class="flex items-center justify-between mb-8">
    <div class="flex items-center gap-3 flex-1">
      <h3 class="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Historial Reciente</h3>
      <div class="h-[1px] bg-slate-200 flex-1"></div>
    </div>
    <button @click="limpiarTodoElHistorial" class="ml-4 text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest transition-colors">
      🗑️ Limpiar todo
    </button>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div v-for="p in listaPresupuestos" :key="p.id" class="relative group">
      
      <div @click="seleccionarHistorial(p)" 
        :class="idPresupuestoSeleccionado === p.id ? 'border-indigo-500 ring-4 ring-indigo-50' : 'border-white hover:border-indigo-200'"
        class="bg-white p-6 rounded-[2rem] shadow-sm border-2 cursor-pointer transition-all hover:shadow-md relative overflow-hidden">
        
        <div class="flex justify-between items-start pr-8">
          <p class="font-black text-slate-800 group-hover:text-indigo-600 truncate">{{ p.cliente }}</p>
          <span class="text-[9px] font-black text-slate-300 uppercase shrink-0">{{ new Date(p.created_at).toLocaleDateString() }}</span>
        </div>

        <div class="flex justify-between items-end mt-4">
           <p class="text-xl font-black text-slate-900">{{ formatCurrency(p.total) }}</p>
           <span class="text-[10px] font-bold text-indigo-500 opacity-0 group-hover:opacity-100 transition-all underline">Recuperar</span>
        </div>
      </div>

      <button 
        @click.stop="eliminarPresupuesto(p.id)" 
        class="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white z-10"
        title="Eliminar presupuesto"
      >
        <span class="text-xs">✕</span>
      </button>
    </div>
  </div>
</div>
        </div>
      </div>
    </div>

    <div v-if="verConfig" class="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-6">
      <div class="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl border border-white">
        <div class="flex justify-between items-center mb-8">
          <h3 class="text-2xl font-black text-indigo-600 italic tracking-tighter">Mi Perfil Fiscal</h3>
          <button @click="verConfig = false" class="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">✕</button>
        </div>
        <div class="space-y-4">
          <input v-model="configEmpresa.nombre" placeholder="Nombre comercial" class="w-full p-5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold" />
          <input v-model="configEmpresa.nif" placeholder="NIF / CIF" class="w-full p-5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold" />
          <input v-model="configEmpresa.direccion" placeholder="Dirección" class="w-full p-5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold" />
        </div>
        <button @click="verConfig = false" class="w-full mt-10 bg-indigo-600 text-white p-5 rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Guardar Cambios</button>
      </div>
    </div>

  </div>
</template>

<style>
.v-enter-active, .v-leave-active {
  transition: opacity 0.3s ease;
}
.v-enter-from, .v-leave-to {
  opacity: 0;
}

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>