<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// --- ESTADOS DE LA APLICACIÓN ---
const grabando = ref(false)
const transcripcion = ref('')
const textoEnVivo = ref('')
const cargando = ref(false)
const logoUrl = ref(null)
const verHistorial = ref(false)

// --- CONFIGURACIÓN DE EMPRESA ---
const configEmpresa = ref({
  nombre: 'MI EMPRESA PROFESIONAL S.L.',
  nif: 'NIF/CIF: B-88776655',
  direccion: 'Av. Innovación 42, Planta 5, Madrid',
  email: 'proyectos@miempresa.com',
  ivaPorcentaje: 21,
  notasLegales: '1. Los precios no incluyen retenciones adicionales.\n2. Presupuesto sujeto a disponibilidad de stock.\n3. Validez de la oferta: 30 días.',
  id: Math.floor(10000 + Math.random() * 90000),
  fecha: new Date().toLocaleDateString('es-ES')
})

// --- DATA DEL PRESUPUESTO Y HISTORIAL ---
const presupuesto = ref(null)
const historial = ref([])

// --- LÓGICA DE FIRMA (CANVAS) ---
const canvasRef = ref(null)
let drawing = false

const startDrawing = (e) => {
  drawing = true
  draw(e)
}
const stopDrawing = () => {
  drawing = false
  if (canvasRef.value) {
    const ctx = canvasRef.value.getContext('2d')
    ctx.beginPath()
  }
}
const draw = (e) => {
  if (!drawing || !canvasRef.value) return
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  const rect = canvas.getBoundingClientRect()
  
  const clientX = e.clientX || (e.touches && e.touches[0].clientX)
  const clientY = e.clientY || (e.touches && e.touches[0].clientY)
  
  const x = clientX - rect.left
  const y = clientY - rect.top

  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#4f46e5'

  ctx.lineTo(x, y)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x, y)
}
const borrarFirma = () => {
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
}

// --- PERSISTENCIA (Local Storage) ---
onMounted(() => {
  try {
    const savedPresu = localStorage.getItem('v3_presupuesto_data')
    const savedConfig = localStorage.getItem('v3_config_data')
    const savedLogo = localStorage.getItem('v3_logo_data')
    const savedHistorial = localStorage.getItem('v3_historial')
    
    if (savedPresu) presupuesto.value = JSON.parse(savedPresu)
    if (savedConfig) configEmpresa.value = JSON.parse(savedConfig)
    if (savedLogo) logoUrl.value = savedLogo
    if (savedHistorial) historial.value = JSON.parse(savedHistorial)
  } catch (e) {
    console.error("Error cargando caché:", e)
  }
})

watch([presupuesto, configEmpresa, logoUrl], () => {
  if (presupuesto.value) {
    localStorage.setItem('v3_presupuesto_data', JSON.stringify(presupuesto.value))
    localStorage.setItem('v3_config_data', JSON.stringify(configEmpresa.value))
    if (logoUrl.value) localStorage.setItem('v3_logo_data', logoUrl.value)
  }
}, { deep: true })

// --- GESTIÓN DEL HISTORIAL ---
const guardarEnHistorial = () => {
  if (!presupuesto.value) return
  const itemHistorial = {
    id: configEmpresa.value.id,
    fecha: configEmpresa.value.fecha,
    cliente: presupuesto.value.cliente,
    total: calculos.value.total,
    data: JSON.parse(JSON.stringify(presupuesto.value)),
    config: JSON.parse(JSON.stringify(configEmpresa.value))
  }
  const filtrado = historial.value.filter(h => h.id !== itemHistorial.id)
  historial.value = [itemHistorial, ...filtrado].slice(0, 10)
  localStorage.setItem('v3_historial', JSON.stringify(historial.value))
}

const cargarDeHistorial = (item) => {
  presupuesto.value = JSON.parse(JSON.stringify(item.data))
  configEmpresa.value = JSON.parse(JSON.stringify(item.config))
  verHistorial.value = false
  borrarFirma()
}

// --- MOTOR DE CÁLCULOS ---
const calculos = computed(() => {
  if (!presupuesto.value) return { subtotal: 0, iva: 0, total: 0 }
  const subtotal = presupuesto.value.items.reduce((acc, item) => {
    return acc + ((Number(item.cant) || 0) * (Number(item.precio) || 0))
  }, 0)
  const iva = subtotal * (configEmpresa.value.ivaPorcentaje / 100)
  return {
    subtotal: subtotal.toFixed(2),
    iva: iva.toFixed(2),
    total: (subtotal + iva).toFixed(2)
  }
})

const formatCurrency = (v) => {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)
}

// --- RECONOCIMIENTO DE VOZ ---
let recognition = null

const toggleGrabacion = () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) return alert("Navegador no compatible.")

  if (!recognition) {
    recognition = new SpeechRecognition()
    recognition.lang = 'es-ES'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (event) => {
      let interim = ''; let final = ''
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript
        else interim += event.results[i][0].transcript
      }
      transcripcion.value = final || interim
      textoEnVivo.value = interim
    }
    recognition.onend = () => { grabando.value = false }
  }

  if (grabando.value) recognition.stop()
  else {
    transcripcion.value = ''; textoEnVivo.value = '';
    recognition.start(); grabando.value = true
  }
}

const generarConIA = async () => {
  if (!transcripcion.value) return
  cargando.value = true
  try {
    const data = await $fetch('/api/generar', { method: 'POST', body: { texto: transcripcion.value } })
    configEmpresa.value.id = Math.floor(10000 + Math.random() * 90000)
    // Se asegura que los datos de la IA entren limpios
    presupuesto.value = { ...data, fecha: new Date().toLocaleDateString('es-ES') }
    guardarEnHistorial()
  } catch (e) {
    alert("Error de conexión con la IA.")
  } finally {
    cargando.value = false
  }
}

const handleLogo = (e) => {
  const file = e.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (r) => logoUrl.value = r.target.result
    reader.readAsDataURL(file)
  }
}

const añadirFila = () => {
  if (!presupuesto.value) presupuesto.value = { cliente: 'Nombre del Cliente', items: [] }
  presupuesto.value.items.push({ desc: 'Nuevo concepto...', cant: 1, precio: 0 })
}

const borrarFila = (i) => presupuesto.value.items.splice(i, 1)

// --- MOTOR PDF ---
const descargarPDF = () => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const primaryColor = [79, 70, 229] 
  const textColor = [30, 41, 59]

  if (logoUrl.value) {
    try { doc.addImage(logoUrl.value, 'PNG', 15, 15, 30, 30) } catch (e) {}
  }

  doc.setTextColor(textColor[0], textColor[1], textColor[2])
  doc.setFont('helvetica', 'bold').setFontSize(18).text(configEmpresa.value.nombre, 50, 25)
  doc.setFontSize(9).setFont('helvetica', 'normal').text(configEmpresa.value.nif, 50, 31)
  doc.text(configEmpresa.value.direccion, 50, 36)

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.setFontSize(24).setFont('helvetica', 'bold').text('PRESUPUESTO', 195, 25, { align: 'right' })
  doc.setTextColor(textColor[0], textColor[1], textColor[2])
  doc.setFontSize(10).text(`Ref: #${configEmpresa.value.id}`, 195, 32, { align: 'right' })
  doc.text(`Fecha: ${configEmpresa.value.fecha}`, 195, 37, { align: 'right' })

  autoTable(doc, {
    startY: 60,
    head: [["Descripción", "Cant.", "Precio Unit.", "Total"]],
    body: presupuesto.value.items.map(item => [item.desc, item.cant, formatCurrency(item.precio), formatCurrency(item.cant * item.precio)]),
    headStyles: { fillColor: primaryColor },
    styles: { fontSize: 9 }
  })

  const finalY = doc.lastAutoTable.finalY + 15
  
  const firmaX = 140
  doc.setFontSize(9).setFont('helvetica', 'bold').text('FIRMADO POR (EMISOR):', firmaX, finalY)
  if (canvasRef.value) {
    const firmaData = canvasRef.value.toDataURL('image/png')
    doc.addImage(firmaData, 'PNG', firmaX, finalY + 2, 45, 15)
    doc.setDrawColor(200).line(firmaX, finalY + 18, firmaX + 45, finalY + 18)
    doc.setFontSize(7).setTextColor(150).text(configEmpresa.value.nombre, firmaX, finalY + 22)
  }

  doc.setFontSize(10).setTextColor(textColor[0], textColor[1], textColor[2])
  doc.text('Subtotal:', 15, finalY + 5)
  doc.text(formatCurrency(calculos.value.subtotal), 50, finalY + 5)
  doc.text(`IVA (${configEmpresa.value.ivaPorcentaje}%):`, 15, finalY + 12)
  doc.text(formatCurrency(calculos.value.iva), 50, finalY + 12)
  doc.setFontSize(14).setFont('helvetica', 'bold').text('TOTAL:', 15, finalY + 25)
  doc.text(formatCurrency(calculos.value.total), 50, finalY + 25)

  doc.save(`PRESUPUESTO_${configEmpresa.value.id}.pdf`)
  guardarEnHistorial()
}

const compartirWA = () => {
  const msg = `*PRESUPUESTO #${configEmpresa.value.id}*%0A*Para:* ${presupuesto.value.cliente}%0A*Total:* ${formatCurrency(calculos.value.total)}`
  window.open(`https://wa.me/?text=${msg}`, '_blank')
}
</script>

<template>
  <div class="min-h-screen bg-slate-100 p-2 md:p-10 font-sans text-slate-800">
    <div class="max-w-5xl mx-auto">
      
      <nav class="flex flex-col md:flex-row justify-between items-center mb-8 gap-6 bg-white p-6 rounded-[2rem] shadow-sm">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg text-white text-2xl">🎙️</div>
          <div>
            <h1 class="text-2xl font-black tracking-tighter">Presu<span class="text-indigo-600">Voz</span></h1>
            <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Profesional Edition</p>
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          <button @click="verHistorial = true" class="bg-slate-100 px-5 py-2.5 rounded-xl text-xs font-black hover:bg-indigo-50 transition-all">📂 HISTORIAL</button>
          <label class="cursor-pointer bg-indigo-600 px-5 py-2.5 rounded-xl text-white text-xs font-black hover:bg-slate-900 transition-all">
            <span>🖼️ SUBIR LOGO</span>
            <input type="file" class="hidden" @change="handleLogo" accept="image/*">
          </label>
        </div>
      </nav>

      <div v-if="verHistorial" class="fixed inset-0 z-50 flex">
        <div class="w-full max-w-sm bg-white shadow-2xl p-8 overflow-y-auto animate-slide-in">
          <div class="flex justify-between items-center mb-8">
            <h2 class="text-xl font-black">Historial Reciente</h2>
            <button @click="verHistorial = false" class="text-slate-300 hover:text-red-500 text-xl">✕</button>
          </div>
          <div v-for="item in historial" :key="item.id" @click="cargarDeHistorial(item)" 
               class="p-4 mb-3 bg-slate-50 rounded-2xl border-2 border-transparent hover:border-indigo-600 cursor-pointer transition-all">
            <p class="text-[10px] font-bold text-slate-400">#{{ item.id }} - {{ item.fecha }}</p>
            <p class="font-black text-slate-800 truncate">{{ item.cliente }}</p>
            <p class="text-indigo-600 font-black">{{ formatCurrency(item.total) }}</p>
          </div>
        </div>
        <div class="flex-1 bg-slate-900/40 backdrop-blur-sm" @click="verHistorial = false"></div>
      </div>

      <section class="mb-10">
        <div class="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-xl border border-white text-center">
          <button @click="toggleGrabacion" 
            :class="grabando ? 'bg-red-500 ring-8 ring-red-50' : 'bg-slate-900 hover:bg-indigo-600'"
            class="w-20 h-20 rounded-full flex items-center justify-center text-white transition-all duration-300 mx-auto mb-6 shadow-xl"
          >
            <span class="text-3xl">{{ grabando ? '⏹️' : '🎤' }}</span>
          </button>

          <div class="max-w-2xl mx-auto min-h-[80px] flex items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-6 transition-all" :class="{'border-indigo-300 bg-indigo-50/30': grabando}">
            <p v-if="!transcripcion && !grabando" class="text-slate-400 italic text-sm md:text-base">"Haz un presupuesto para María García de 3 reparaciones de fontanería a 50€ cada una..."</p>
            <p v-else class="text-lg font-bold text-slate-800">{{ transcripcion }}<span class="text-indigo-400">{{ textoEnVivo }}</span></p>
          </div>

          <button v-if="transcripcion && !grabando" @click="generarConIA" :disabled="cargando"
            class="mt-6 w-full md:w-auto px-8 py-4 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:scale-105 transition-all disabled:opacity-50">
            {{ cargando ? 'PROCESANDO...' : '🪄 GENERAR' }}
          </button>
        </div>
      </section>

      <div v-if="presupuesto" class="bg-white shadow-2xl rounded-[2.5rem] overflow-hidden border border-slate-200 animate-fade-in mb-10">
        <div class="p-4 md:p-14">
          
          <div class="flex flex-col md:flex-row justify-between mb-8 md:mb-14 gap-10">
            <div class="flex-1 space-y-3">
              <div v-if="logoUrl" class="h-20 flex items-start mb-4"><img :src="logoUrl" class="max-h-full"></div>
              <div class="group relative">
                <input v-model="configEmpresa.nombre" class="edit-field text-2xl md:text-3xl font-black text-slate-900 uppercase w-full">
                <span class="edit-icon">✎</span>
              </div>
              <div class="group relative">
                <input v-model="configEmpresa.nif" class="edit-field text-sm font-bold text-slate-400 w-full">
                <span class="edit-icon">✎</span>
              </div>
              <div class="group relative">
                <input v-model="configEmpresa.direccion" class="edit-field text-sm text-slate-400 w-full">
                <span class="edit-icon">✎</span>
              </div>
            </div>
            <div class="text-left md:text-right">
              <h2 class="text-4xl md:text-5xl font-black text-indigo-600 italic tracking-tighter mb-2">PRESUPUESTO</h2>
              <div class="bg-slate-900 text-white p-3 rounded-xl inline-block">
                <p class="text-[9px] font-black uppercase">Referencia</p>
                <p class="font-black text-lg">#{{ configEmpresa.id }}</p>
              </div>
              <p class="font-bold text-xs mt-2 text-slate-400">{{ configEmpresa.fecha }}</p>
            </div>
          </div>

          <div class="mb-10 bg-indigo-50 p-6 rounded-2xl border-l-8 border-indigo-600 group relative">
            <span class="text-[10px] font-black text-indigo-600 uppercase block mb-1">CLIENTE DESTINATARIO</span>
            <input v-model="presupuesto.cliente" class="edit-field text-2xl font-black w-full bg-transparent">
            <span class="edit-icon">✎</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full mb-6 min-w-[500px]">
              <thead>
                <tr class="text-[10px] uppercase font-black text-slate-400 border-b-2 border-slate-100">
                  <th class="w-8"></th>
                  <th class="text-left pb-4">Descripción</th>
                  <th class="text-center pb-4 w-20">Cant.</th>
                  <th class="text-right pb-4 w-28">Precio</th>
                  <th class="text-right pb-4 w-32">Subtotal</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                <tr v-for="(item, idx) in presupuesto.items" :key="idx">
                  <td class="py-5"><button @click="borrarFila(idx)" class="text-red-200 hover:text-red-600 transition-colors">✕</button></td>
                  <td class="py-5"><input v-model="item.desc" class="edit-field font-bold text-slate-700 w-full"></td>
                  <td class="py-5"><input v-model.number="item.cant" type="number" class="w-full text-center font-black bg-slate-100 rounded-lg py-2"></td>
                  <td class="py-5 text-right"><input v-model.number="item.precio" type="number" step="0.01" class="w-full text-right font-bold bg-transparent outline-none"></td>
                  <td class="py-5 text-right font-black text-xl text-slate-900">{{ formatCurrency(item.cant * item.precio) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <button @click="añadirFila" class="mb-10 text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-600 hover:text-white transition-all">
            + AÑADIR LÍNEA
          </button>

          <div class="flex flex-col md:flex-row justify-between pt-10 border-t-8 border-slate-900 gap-12">
            <div class="flex-1 space-y-6">
              <div class="max-w-xs">
                <div class="flex justify-between items-center mb-3">
                  <span class="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Firma Emisor</span>
                  <button @click="borrarFirma" class="text-[10px] font-bold text-red-500 hover:underline">REINICIAR</button>
                </div>
                <canvas ref="canvasRef" width="350" height="120" 
                  class="w-full bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 cursor-crosshair touch-none shadow-inner"
                  @mousedown="startDrawing" @mousemove="draw" @mouseup="stopDrawing" @mouseleave="stopDrawing"
                  @touchstart.prevent="startDrawing" @touchmove.prevent="draw" @touchend.prevent="stopDrawing">
                </canvas>
              </div>

              <div>
                <p class="text-[10px] font-black uppercase mb-2">Términos</p>
                <textarea v-model="configEmpresa.notasLegales" class="edit-field text-[11px] text-slate-400 w-full h-24 bg-slate-50 p-4 rounded-xl resize-none"></textarea>
              </div>
            </div>

            <div class="w-full md:w-64 space-y-3">
              <div class="flex justify-between text-sm font-bold text-slate-400">
                <span>SUBTOTAL</span>
                <span>{{ formatCurrency(calculos.subtotal) }}</span>
              </div>
              <div class="flex justify-between items-center text-sm font-bold text-slate-400">
                <div class="flex items-center gap-1">
                  <span>I.V.A.</span>
                  <input v-model.number="configEmpresa.ivaPorcentaje" type="number" class="w-10 text-center bg-slate-100 rounded p-1 text-indigo-600 font-black">
                  <span>%</span>
                </div>
                <span>{{ formatCurrency(calculos.iva) }}</span>
              </div>
              <div class="pt-4 border-t-2 border-slate-100 text-right">
                <span class="text-xs font-black text-indigo-600 block uppercase">Total</span>
                <div class="text-5xl font-black text-slate-900 tracking-tighter">{{ formatCurrency(calculos.total) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="presupuesto" class="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
        <button @click="descargarPDF" class="flex items-center justify-center gap-3 py-6 bg-slate-900 text-white rounded-3xl font-black hover:bg-black transition-all shadow-xl">
          📄 DESCARGAR PDF
        </button>
        <button @click="compartirWA" class="flex items-center justify-center gap-3 py-6 bg-[#25D366] text-white rounded-3xl font-black hover:scale-[1.02] transition-all shadow-xl">
          💬 WHATSAPP
        </button>
      </div>

    </div>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');

body { 
  font-family: 'Plus Jakarta Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
  background-color: #f1f5f9;
  touch-action: manipulation;
}

.edit-field {
  background: transparent;
  border: 1px solid transparent;
  outline: none;
  transition: all 0.2s;
  padding: 4px 8px;
  border-radius: 8px;
}

.edit-field:hover {
  background: rgba(79, 70, 229, 0.04);
}

.edit-field:focus {
  background: white;
  border-color: #4f46e5;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.08);
}

.edit-icon {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  color: #4f46e5;
  opacity: 0;
  pointer-events: none;
}

.group:hover .edit-icon {
  opacity: 0.5;
}

@keyframes slideIn {
  from { transform: translateX(-100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
.animate-slide-in { animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in { animation: fadeIn 0.5s ease-out; }

input::-webkit-outer-spin-button, input::-webkit-inner-spin-button {
  -webkit-appearance: none; margin: 0;
}

canvas {
  touch-action: none;
}
</style>