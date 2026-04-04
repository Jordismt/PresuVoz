<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { supabase } from "~/lib/supabase";
import { useUser } from "~/composable/useUser";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { signInWithGoogle } from "~/lib/supabase";
// --- CONFIGURACIÓN DE STRIPE ---
const PRICE_ID_UNICO = "price_1THMyXBzDH5mgeinAIX7sJTB";
const PRICE_ID_PRO = "price_1THS8rBzDH5mgeink9B7w4lQ";

const { user, loadingUser } = useUser();
const email = ref("");
const password = ref("");
const esRegistro = ref(false);
const cargandoAuth = ref(false);
const profile = ref<any>(null);
const mostrarLanding = ref(true);
const registroExitoso = ref(false);
const grabando = ref(false);
const transcripcion = ref("");
const textoEnVivo = ref("");
const cargandoIA = ref(false);
const verConfig = ref(false);
const idPresupuestoSeleccionado = ref<string | null>(null);
const mostrarRecargaMovil = ref(false);

let recognition: any = null;

interface Item {
  desc: string;
  cant: number;
  precio: number;
}
interface Presupuesto {
  cliente: string;
  items: Item[];
}
const presupuesto = ref<Presupuesto | null>(null);
const listaPresupuestos = ref<any[]>([]);

const configEmpresa = ref({
  nombre: "Mi Empresa S.L.",
  nif: "11223344A",
  direccion: "Calle Falsa 123, Madrid",
  ivaPorcentaje: 21,
  id: Math.floor(10000 + Math.random() * 90000),
  fecha: new Date().toLocaleDateString("es-ES"),
});

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

const fetchProfile = async () => {
  if (!user.value) return;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.value.id).single();
  if (!error) profile.value = data;
};

const cargarHistorial = async () => {
  if (!user.value) return;
  const { data, error } = await supabase
    .from("presupuestos")
    .select("*")
    .eq("user_id", user.value.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error cargando historial:", error.message);
    return;
  }
  listaPresupuestos.value = data || [];
};

onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("success")) {
    mostrarLanding.value = false;
    setTimeout(async () => {
      await fetchProfile();
      window.history.replaceState({}, document.title, "/");
    }, 2000);
  }
});

watch(
  user,
  (newUser) => {
    if (newUser) {
      fetchProfile();
      cargarHistorial();
    }
  },
  { immediate: true },
);

const handleAuth = async () => {
  cargandoAuth.value = true;

  if (esRegistro.value) {
    const { data, error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
    });
    if (error) {
      alert("Error: " + error.message);
    } else {
      // AQUÍ activamos la pantalla del sobre 📩
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

const logout = async () => {
  await supabase.auth.signOut();
  presupuesto.value = null;
  profile.value = null;
  mostrarLanding.value = true;
};

const toggleGrabacion = () => {
  if (!process.client) return;

  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  // Si el navegador no soporta SpeechRecognition en absoluto, informamos
  if (!SpeechRecognition) {
    return alert(
      "⚠️ Tu navegador no soporta dictado por voz.\n\nEn iPhone usa Safari. En Android usa Chrome."
    );
  }

  if (!recognition) {
    recognition = new SpeechRecognition();
    recognition.lang = "es-ES";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          transcripcion.value += e.results[i][0].transcript + " ";
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      textoEnVivo.value = interim;
    };

    recognition.onerror = (event: any) => {
      console.error("Error Speech:", event.error);
      // 'no-speech' y 'audio-capture' son errores recuperables en Android, no frenamos
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        grabando.value = false;
        alert("El acceso al micrófono ha sido bloqueado. Revisa los permisos del navegador.");
      }
    };

    recognition.onend = () => {
      // AUTO-REINICIO: si el usuario sigue grabando, reiniciamos automáticamente
      // Esto soluciona el corte en Android y Chrome iOS
      if (grabando.value) {
        try {
          recognition.start();
        } catch (e) {
          // Evita el error si ya está activo (race condition)
        }
      } else {
        textoEnVivo.value = "";
      }
    };
  }

  if (grabando.value) {
    grabando.value = false; // Lo ponemos a false ANTES de stop() para que onend no reinicie
    try {
      recognition.stop();
    } catch (e) {
      // ignorar
    }
  } else {
    try {
      textoEnVivo.value = "";
      transcripcion.value = ""; // Limpiamos también la transcripción al iniciar nueva grabación
      recognition.start();
      grabando.value = true;
    } catch (e) {
      alert("Error al iniciar el dictado. Reintenta.");
      grabando.value = false;
    }
  }
};

const generarConIA = async () => {
  if (!transcripcion.value) return;
  cargandoIA.value = true;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch("/api/generar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ texto: transcripcion.value }),
    });
    if (!res.ok) throw new Error((await res.json()).statusMessage || "Error");
    presupuesto.value = await res.json();
    idPresupuestoSeleccionado.value = null;
    await guardarEnDB();
    await fetchProfile();
  } catch (e: any) {
    alert("❌ " + e.message);
  } finally {
    cargandoIA.value = false;
  }
};

const guardarEnDB = async () => {
  if (!presupuesto.value || !user.value) return;
  const datosAGuardar: any = {
    user_id: user.value.id,
    cliente: presupuesto.value.cliente,
    items: presupuesto.value.items,
    total: calculos.value.total,
  };
  if (idPresupuestoSeleccionado.value) {
    datosAGuardar.id = idPresupuestoSeleccionado.value;
  }
  const { data, error } = await supabase
    .from("presupuestos")
    .upsert(datosAGuardar, { onConflict: "id" })
    .select();

  if (error) {
    console.error("Error al guardar:", error.message);
  } else if (data && data[0]) {
    idPresupuestoSeleccionado.value = data[0].id;
  }
  await cargarHistorial();
};

const seleccionarHistorial = (p: any) => {
  idPresupuestoSeleccionado.value = p.id;
  presupuesto.value = { cliente: p.cliente, items: p.items };
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const eliminarFila = (i: number) => presupuesto.value?.items.splice(i, 1);
const añadirFila = () => presupuesto.value?.items.push({ desc: "Nuevo concepto", cant: 1, precio: 0 });

// --- LÓGICA DE GENERACIÓN DE PDF (UNIFICADA) ---

// Esta función solo se encarga del diseño y los datos
const prepararPDF = () => {
  if (!presupuesto.value) return null;
  const doc = new jsPDF();
  const c = configEmpresa.value;
  const p = presupuesto.value;
  const calc = calculos.value; // Usamos tus cálculos reactivos

  // --- 1. CABECERA (MARCA Y DATOS EMISOR) ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22).setTextColor(79, 70, 229).text(c.nombre.toUpperCase(), 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9).setTextColor(100);
  doc.text(`${c.nif} • ${c.direccion}`, 14, 27);
  doc.text(`Email: ${c.email || "Contacto@empresa.com"}`, 14, 32);

  // --- 2. INFO DEL DOCUMENTO (DERECHA) ---
  doc.setDrawColor(220).line(130, 15, 130, 35); // Línea vertical decorativa
  doc.setFontSize(10).setTextColor(0).setFont("helvetica", "bold");
  doc.text("PRESUPUESTO", 140, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9).text(`Nº: ${c.id}`, 140, 25);
  doc.text(`Fecha: ${c.fecha}`, 140, 30);

  // --- 3. BLOQUE CLIENTE (RECUADRO GRIS SUTIL) ---
  doc.setFillColor(248, 250, 252);
  doc.rect(14, 40, 182, 15, "F");
  doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(79, 70, 229);
  doc.text("CLIENTE:", 20, 49);
  doc.setTextColor(30, 41, 59).text(p.cliente.toUpperCase(), 40, 49);

  // --- 4. TABLA DE ARTÍCULOS ---
  autoTable(doc, {
    startY: 60,
    head: [["DESCRIPCIÓN", "CANT.", "PRECIO", "SUBTOTAL"]],
    body: p.items.map((i) => [i.desc, i.cant, `${i.precio}€`, `${(i.cant * i.precio).toFixed(2)}€`]),
    theme: "striped",
    headStyles: {
      fillColor: [79, 70, 229],
      fontSize: 10,
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 100 }, // Descripción ancha
      1: { halign: "center" },
      2: { halign: "right" },
      3: { halign: "right", fontStyle: "bold" },
    },
    styles: { fontSize: 9, cellPadding: 4 },
  });

  // --- 5. TOTALES (ALINEADOS A LA DERECHA) ---
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  const rightAlignX = 195; // Margen derecho

  doc.setFontSize(10).setTextColor(100).setFont("helvetica", "normal");
  doc.text(`Subtotal:`, 140, finalY);
  doc.text(`${formatCurrency(calc.subtotal)}`, rightAlignX, finalY, {
    align: "right",
  });

  doc.text(`IVA (${c.ivaPorcentaje}%):`, 140, finalY + 7);
  doc.text(`${formatCurrency(calc.iva)}`, rightAlignX, finalY + 7, {
    align: "right",
  });

  // Línea de total
  doc
    .setDrawColor(79, 70, 229)
    .setLineWidth(0.5)
    .line(135, finalY + 10, 195, finalY + 10);

  doc.setFontSize(12).setTextColor(79, 70, 229).setFont("helvetica", "bold");
  doc.text(`TOTAL:`, 140, finalY + 17);
  doc.text(`${formatCurrency(calc.total)}`, rightAlignX, finalY + 17, {
    align: "right",
  });

  // --- 6. PIE DE PÁGINA / NOTAS LEGALES ---
  const footerY = 275;
  doc.setFontSize(8).setTextColor(150).setFont("helvetica", "italic");
  doc.text("Este presupuesto tiene una validez de 15 días.", 14, footerY);
  doc.text("Gracias por confiar en nuestros servicios.", 14, footerY + 4);

  // Branding sutil de tu app ;)
  doc.setFont("helvetica", "normal").text("Generado con PresuVoz.es", 160, footerY + 4);

  return doc;
};
// Esta función solo descarga
const descargarPDF = () => {
  const doc = prepararPDF();
  if (doc) doc.save(`Presupuesto_${presupuesto.value?.cliente}.pdf`);
};

// Esta función abre el menú de compartir (WhatsApp, etc.)
const compartirPDF = async () => {
  const doc = prepararPDF();
  if (!doc || !presupuesto.value) return;

  const pdfBlob = doc.output("blob");
  const nombreArchivo = `Presupuesto_${presupuesto.value.cliente.replace(/\s+/g, "_")}.pdf`;
  const archivo = new File([pdfBlob], nombreArchivo, {
    type: "application/pdf",
  });

  if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try {
      await navigator.share({
        files: [archivo],
        title: "Presupuesto " + presupuesto.value.cliente,
        text: `Hola ${presupuesto.value.cliente}, te adjunto el presupuesto solicitado.`,
      });
    } catch (err) {
      // Si el usuario cancela, lo descargamos para que no se pierda el trabajo
      doc.save(nombreArchivo);
    }
  } else {
    doc.save(nombreArchivo);
    alert("PDF descargado. En ordenadores, adjúntalo manualmente a WhatsApp.");
  }
};

const iniciarPago = async (priceId: string, mode: "payment" | "subscription") => {
  // Solo bloqueamos si intenta suscribirse de nuevo al plan que ya tiene
  if (mode === "subscription" && profile.value?.plan?.toLowerCase() === "pro") {
    alert(
      "Ya tienes activo el Plan PRO. Si necesitas más usos antes de que renueve tu mes, puedes adquirir 'Créditos puntuales'.",
    );
    return;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  try {
    const data = await $fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token}` },
      body: { priceId, mode },
    });
    if (data?.url) window.location.href = data.url;
  } catch (err: any) {
    alert("❌ " + (err.data?.message || "Error al conectar con Stripe"));
  }
};

const abrirPortalGestion = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  try {
    const data = await $fetch("/api/stripe/portal", {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (data?.url) window.location.href = data.url;
  } catch (err: any) {
    alert("❌ " + (err.data?.message || "Error al abrir el portal de gestión"));
  }
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(v);
const calculos = computed(() => {
  if (!presupuesto.value) return { subtotal: 0, iva: 0, total: 0 };
  const subtotal = presupuesto.value.items.reduce((acc, i) => acc + i.cant * i.precio, 0);
  const iva = subtotal * (configEmpresa.value.ivaPorcentaje / 100);
  return { subtotal, iva, total: subtotal + iva };
});

const eliminarPresupuesto = async (id: string) => {
  if (!confirm("¿Seguro que quieres borrar este presupuesto?")) return;

  const { error } = await supabase.from("presupuestos").delete().eq("id", id);

  if (error) {
    alert("Error al eliminar: " + error.message);
  } else {
    // Si el presupuesto que estamos borrando es el que está abierto, lo cerramos
    if (idPresupuestoSeleccionado.value === id) {
      presupuesto.value = null;
      idPresupuestoSeleccionado.value = null;
    }
    await cargarHistorial();
  }
};

const limpiarTodoElHistorial = async () => {
  if (!user.value) return;
  if (!confirm("⚠️ ¿Estás seguro? Se borrarán TODOS tus presupuestos guardados de forma permanente.")) return;

  const { error } = await supabase.from("presupuestos").delete().eq("user_id", user.value.id);

  if (error) {
    alert("Error: " + error.message);
  } else {
    presupuesto.value = null;
    idPresupuestoSeleccionado.value = null;
    await cargarHistorial();
  }
};
</script>

<template>
  <div class="min-h-screen bg-[#f1f5f9] text-slate-900 font-sans">
    <div v-if="loadingUser" class="fixed inset-0 bg-white z-50 flex items-center justify-center">
      <div class="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div v-else-if="!user">
      <div
        v-if="mostrarLanding"
        class="min-h-screen bg-white selection:bg-indigo-600 selection:text-white text-slate-900 overflow-x-hidden antialiased">
        <component :is="'script'" type="application/ld+json">
          { "@context": "https://schema.org", "@type": "SoftwareApplication", "name": "PresuVoz AI",
          "operatingSystem": "Web", "applicationCategory": "BusinessApplication", "offers": { "@type":
          "AggregateOffer", "lowPrice": "0", "priceCurrency": "EUR" }, "aggregateRating": { "@type":
          "AggregateRating", "ratingValue": "4.9", "reviewCount": "1240" } }
        </component>

        <nav class="fixed top-0 z-[100] w-full bg-white/80 backdrop-blur-xl border-b border-slate-100">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex justify-between items-center">
            <div
              class="flex items-center gap-2 sm:gap-3 group cursor-pointer"
              @click="window.scrollTo({ top: 0, behavior: 'smooth' })">
              <div
                class="relative shrink-0 transform -rotate-3 transition-transform hover:rotate-0 duration-300">
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
                @click="
                  mostrarLanding = false;
                  esRegistro = false;
                "
                class="hidden sm:block text-sm font-bold text-slate-500 hover:text-black transition-colors">
                Entrar
              </button>
              <button
                @click="
                  mostrarLanding = false;
                  esRegistro = true;
                "
                class="px-4 sm:px-8 py-2.5 sm:py-3 bg-black text-white rounded-full text-xs sm:text-sm font-black hover:bg-indigo-600 transition-all shadow-xl active:scale-95">
                Empezar Gratis
              </button>
            </div>
          </div>
        </nav>

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

            <div class="flex flex-col items-center gap-8 sm:gap-10">
              <button
                @click="
                  mostrarLanding = false;
                  esRegistro = true;
                "
                class="group relative w-full sm:w-auto px-8 sm:px-16 py-6 sm:py-8 bg-black text-white rounded-2xl sm:rounded-3xl font-black text-xl sm:text-2xl shadow-2xl hover:bg-indigo-600 transition-all active:scale-95 overflow-hidden">
                <span class="relative z-10">Empezar PresuVoz Gratis 🚀</span>
                <div
                  class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </button>

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
                Dicta tus trabajos y genera un <strong>presupuesto profesional en PDF</strong> listo para
                enviar por WhatsApp en solo 30 segundos.
              </span>
            </p>
          </div>

          <div class="max-w-6xl mx-auto mt-20 sm:mt-32 px-4 sm:px-6 relative">
            <div
              class="absolute -top-10 sm:-top-20 left-1/2 -translate-x-1/2 w-[110%] h-[300px] sm:h-[500px] bg-indigo-600/5 blur-[60px] sm:blur-[120px] rounded-full -z-10"></div>

            <p class="text-center mt-8 text-slate-400 text-sm font-medium">
              Voz real procesada con nuestra IA en menos de 10 segundos.
            </p>
          </div>
        </header>

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
                  v-for="stat in [
                    { n: '30s', t: 'Creación' },
                    { n: '100%', t: 'Precisión' },
                    { n: '+15h', t: 'Tiempo libre' },
                    { n: 'A+', t: 'Imagen Pro' },
                  ]"
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
                    <li class="flex items-center gap-3">
                      <div
                        class="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px]">
                        ✓
                      </div>
                      Historial completo guardado
                    </li>
                    <li class="flex items-center gap-3">
                      <div
                        class="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px]">
                        ✓
                      </div>
                      Envío directo por WhatsApp
                    </li>
                    <li class="flex items-center gap-3">
                      <div
                        class="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px]">
                        ✓
                      </div>
                      PDF con tus datos fiscales
                    </li>
                  </ul>
                </div>
                <button
                  @click="
                    mostrarLanding = false;
                    esRegistro = true;
                  "
                  class="w-full py-5 sm:py-6 rounded-2xl sm:rounded-3xl bg-slate-50 text-slate-900 font-black hover:bg-black hover:text-white transition-all uppercase text-[10px] sm:text-xs tracking-widest border border-slate-200">
                  Comprar 1 Crédito
                </button>
              </div>

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
                      Cada presupuesto a
                      <span class="text-indigo-400 italic">0,40€</span>
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
                  </ul>
                </div>

                <button
                  @click="
                    mostrarLanding = false;
                    esRegistro = true;
                  "
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

        <section class="py-16 bg-slate-50">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-12">
              <h2 class="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Lo que dicen otros profesionales
              </h2>
              <p class="text-lg text-slate-600 max-w-2xl mx-auto">
                Autónomos que ya han dejado de perder horas de oficina y han pasado al presupuesto por voz.
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div
                class="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div class="flex items-center gap-1 text-amber-400 mb-4">
                  <span>★★★★★</span>
                </div>
                <p class="text-slate-600 italic mb-6">
                  "Antes llegaba a casa a las 8 de la tarde y me ponía a escribir presupuestos. Ahora los
                  envío desde la furgoneta nada más terminar el aviso. Una joya."
                </p>
                <div class="flex items-center gap-4">
                  <div
                    class="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                    JR
                  </div>
                  <div>
                    <h4 class="font-bold text-slate-900">Juan Rodríguez</h4>
                    <p class="text-sm text-slate-500">Fontanería</p>
                  </div>
                </div>
              </div>

              <div
                class="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div class="flex items-center gap-1 text-amber-400 mb-4">
                  <span>★★★★★</span>
                </div>
                <p class="text-slate-600 italic mb-6">
                  "A mis clientes les encanta que les llegue el PDF por WhatsApp al momento. Da una imagen de
                  profesionalidad que antes no tenía."
                </p>
                <div class="flex items-center gap-4">
                  <div
                    class="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold">
                    MS
                  </div>
                  <div>
                    <h4 class="font-bold text-slate-900">Miguel Sánchez</h4>
                    <p class="text-sm text-slate-500">Instalaciones Eléctricas</p>
                  </div>
                </div>
              </div>

              <div
                class="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div class="flex items-center gap-1 text-amber-400 mb-4">
                  <span>★★★★★</span>
                </div>
                <p class="text-slate-600 italic mb-6">
                  "Dictar los materiales y la mano de obra mientras recojo las herramientas me ahorra por lo
                  menos 5 horas de oficina a la semana. Imprescindible."
                </p>
                <div class="flex items-center gap-4">
                  <div
                    class="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold">
                    CA
                  </div>
                  <div>
                    <h4 class="font-bold text-slate-900">Carlos Arenas</h4>
                    <p class="text-sm text-slate-500">Reformas Integrales</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
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
                v-for="faq in [
                  {
                    q: '¿Entiende catalán o acentos?',
                    a: 'Nuestra IA es políglota. Entiende castellano, catalán, gallego y cualquier acento regional sin que tengas que vocalizar como un locutor.',
                  },
                  {
                    q: '¿Los PDF son profesionales?',
                    a: 'Totalmente. Incluyen tus datos fiscales, desglose de IVA y validez legal. Listos para enviar por WhatsApp al cliente.',
                  },
                  {
                    q: '¿Puedo cancelar cuando quiera?',
                    a: 'Sin permanencias ni letras pequeñas. Puedes darte de baja con un solo clic desde tu panel de usuario en cualquier momento.',
                  },
                  {
                    q: '¿Qué pasa si la IA se equivoca?',
                    a: 'Tú tienes el control. Antes de generar el PDF, verás una tabla donde puedes editar cualquier precio o texto de forma manual.',
                  },
                  {
                    q: '¿Es seguro para mis datos?',
                    a: 'Usamos cifrado de alta seguridad. Tus datos y los de tus clientes están protegidos y nunca se comparten con terceros.',
                  },
                  {
                    q: '¿Cómo funciona el primer gratis?',
                    a: 'Simplemente regístrate y tendrás 1 crédito de regalo. Podrás dictar, generar y descargar tu primer PDF real sin pagar nada.',
                  },
                ]"
                :key="faq.q"
                class="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col h-full">
                <h4 class="font-black text-slate-900 text-lg mb-3 tracking-tight flex items-start gap-2">
                  <span class="text-indigo-600 text-xl italic">?</span>
                  {{ faq.q }}
                </h4>
                <p class="text-slate-500 text-sm font-medium leading-relaxed flex-grow">
                  {{ faq.a }}
                </p>
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
              <h5
                class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-6 sm:mb-8 italic">
                Oficios I
              </h5>
              <ul
                class="space-y-3 sm:space-y-4 font-bold text-slate-500 text-[11px] uppercase tracking-widest">
                <li>
                  <NuxtLink to="/oficios/pintores" class="hover:text-black">Pintores</NuxtLink>
                </li>
                <li>
                  <NuxtLink to="/oficios/electricistas" class="hover:text-black">Electricistas</NuxtLink>
                </li>
                <li>
                  <NuxtLink to="/oficios/fontaneros" class="hover:text-black">Fontaneros</NuxtLink>
                </li>
                <li>
                  <NuxtLink to="/oficios/reformas-integrales" class="hover:text-black">Reformas</NuxtLink>
                </li>
                <li>
                  <NuxtLink to="/oficios/limpieza" class="hover:text-black">Limpieza</NuxtLink>
                </li>
                <li>
                  <NuxtLink to="/oficios/carpinteros" class="hover:text-black">Carpinteros</NuxtLink>
                </li>
                <li>
                  <NuxtLink to="/oficios/climatizacion" class="hover:text-black">Climatización</NuxtLink>
                </li>
              </ul>
            </div>

            <div class="text-center sm:text-left">
              <h5
                class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-6 sm:mb-8 italic">
                Oficios II
              </h5>
              <ul
                class="space-y-3 sm:space-y-4 font-bold text-slate-500 text-[11px] uppercase tracking-widest">
                <li>
                  <NuxtLink to="/oficios/albaniles" class="hover:text-black">Albañiles</NuxtLink>
                </li>
                <li>
                  <NuxtLink to="/oficios/jardineros" class="hover:text-black">Jardineros</NuxtLink>
                </li>
                <li>
                  <NuxtLink to="/oficios/pladuristas" class="hover:text-black">Pladuristas</NuxtLink>
                </li>
                <li>
                  <NuxtLink to="/oficios/cerrajeros" class="hover:text-black">Cerrajeros</NuxtLink>
                </li>
                <li>
                  <NuxtLink to="/oficios/montadores-muebles" class="hover:text-black">Montadores</NuxtLink>
                </li>
                <li>
                  <NuxtLink to="/oficios/tecnicos-electrodomesticos" class="hover:text-black"
                    >Reparaciones</NuxtLink
                  >
                </li>
              </ul>
            </div>

            <div class="text-center sm:text-left">
              <h5
                class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-6 sm:mb-8 italic">
                Soporte & Legal
              </h5>
              <ul
                class="space-y-3 sm:space-y-4 font-bold text-slate-500 text-[11px] uppercase tracking-widest mb-8">
                <li>
                  <NuxtLink to="/legal/privacidad" class="hover:text-black">Privacidad</NuxtLink>
                </li>
                <li>
                  <NuxtLink to="/legal/terminos" class="hover:text-black">Términos</NuxtLink>
                </li>
                <li>
                  <NuxtLink to="/legal/aviso-legal" class="hover:text-black">Aviso Legal</NuxtLink>
                </li>
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

      <div
        v-else
        class="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-indigo-50 via-white to-slate-100 relative">
        <button
          @click="mostrarLanding = true"
          class="absolute top-8 left-8 text-slate-400 hover:text-indigo-600 font-bold flex items-center gap-2 transition-colors">
          ← Volver
        </button>

        <div
          class="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-md border border-white relative overflow-hidden">
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
                {{ esRegistro ? "Crea tu cuenta" : "¡Hola de nuevo!" }}
              </h1>
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
                {{
                  esRegistro ? "¿Ya tienes cuenta? Inicia sesión aquí" : "¿No tienes cuenta? Crea una gratis"
                }}
              </button>
            </div>
            <button
              type="button"
              @click="handleGoogleAuth"
              :disabled="cargandoAuth"
              class="w-full flex items-center justify-center gap-3 p-5 rounded-2xl bg-white border-2 border-slate-100 hover:border-indigo-600 hover:bg-slate-50 transition-all active:scale-[0.98] shadow-sm group">
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

            <div class="relative flex py-2 items-center">
              <div class="flex-grow border-t border-slate-100"></div>
              <span class="flex-shrink mx-4 text-[10px] font-black text-slate-300 uppercase tracking-widest"
                >o con tu email</span
              >
              <div class="flex-grow border-t border-slate-100"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="max-w-6xl mx-auto p-4 md:p-8 pb-32">
      <header
        class="flex flex-col md:flex-row justify-between items-center gap-6 mb-12 bg-white/50 backdrop-blur-md p-6 rounded-[2.5rem] border border-white shadow-sm relative">
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
        <span class="text-[13px] font-black text-slate-400 uppercase tracking-widest">
          • 1 Crédito / Uso
        </span>
        <div
          class="flex flex-wrap items-center justify-between md:justify-end gap-3 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
          <div class="relative">
            <button
              @click="mostrarRecargaMovil = !mostrarRecargaMovil"
              v-if="profile"
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

              <div class="px-4 py-2.5 flex items-center gap-2 group-hover:bg-slate-800 transition-colors">
                <p class="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-400">
                  {{ profile?.plan?.toLowerCase() === "pro" ? "Gestionar" : "Más Créditos" }}
                </p>
                <span class="text-[10px] transform transition-transform group-hover:translate-y-0.5">
                  {{ mostrarRecargaMovil ? "▲" : "▼" }}
                </span>
              </div>
            </button>
          </div>

          <div class="flex gap-2">
            <button
              @click="verConfig = true"
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
              @click="logout"
              class="px-5 h-11 bg-red-50 rounded-xl border border-red-100 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-95">
              Salir
            </button>
          </div>
        </div>
      </header>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div class="lg:col-span-4 space-y-6">
          <div
            class="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200/60 relative overflow-hidden">
            <div class="flex items-center justify-between mb-6">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2"
                >Instrucciones del presupuesto</label
              >
              <button
                v-if="transcripcion"
                @click="
                  transcripcion = '';
                  textoEnVivo = '';
                "
                class="text-[10px] font-bold text-red-400 hover:text-red-600 transition-colors uppercase tracking-widest">
                Borrar ×
              </button>
            </div>

            <div class="relative group">
              <textarea
                v-model="transcripcion"
                placeholder='Ej: "Presupuesto para Juan, instalar 4 enchufes a 50€ cada uno..."'
                class="w-full min-h-[220px] bg-slate-50/50 rounded-[2rem] p-6 text-sm font-medium text-slate-600 leading-relaxed border-2 border-dashed border-slate-100 focus:border-indigo-500 focus:bg-white focus:ring-0 outline-none transition-all resize-none italic"></textarea>

              <div
                v-if="textoEnVivo"
                class="absolute bottom-20 left-6 right-6 bg-white/90 backdrop-blur-sm p-3 rounded-2xl border border-indigo-100 shadow-sm animate-pulse pointer-events-none">
                <p class="text-[11px] font-bold text-indigo-500 italic leading-tight">
                  <span class="opacity-50 uppercase text-[9px] block mb-1">Escuchando...</span>
                  "{{ textoEnVivo }}"
                </p>
              </div>

              <div
                v-if="grabando"
                class="absolute bottom-4 right-6 flex items-center gap-2 bg-red-50 text-red-500 px-3 py-1.5 rounded-full border border-red-100">
                <span class="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                <span class="text-[10px] font-black uppercase tracking-tighter">Micro Activo</span>
              </div>
            </div>

            <div class="grid grid-cols-5 gap-3 mt-6">
              <button
                @click="toggleGrabacion"
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
                @click="generarConIA"
                :disabled="cargandoIA || !transcripcion || profile?.requests_used >= profile?.requests_limit"
                :class="
                  profile?.requests_used >= profile?.requests_limit
                    ? 'bg-slate-300'
                    : 'bg-slate-900 hover:bg-black active:scale-[0.98]'
                "
                class="col-span-4 h-16 text-white rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-xl shadow-slate-200">
                <span v-if="!cargandoIA" class="flex items-center gap-2">
                  ✨ <span>Generar presupuesto</span>
                </span>
                <span
                  v-else
                  class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              </button>
            </div>

            <p
              v-if="profile?.requests_used >= profile?.requests_limit"
              class="text-center text-[10px] text-red-500 font-bold mt-4 uppercase tracking-tighter">
              ⚠️ Créditos agotados. Recarga para continuar.
            </p>
          </div>

          <div class="hidden lg:block">
            <div
              class="relative overflow-hidden bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl border border-slate-800">
              <div
                class="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 blur-[80px] rounded-full pointer-events-none"></div>

              <div class="relative z-10">
                <div class="flex items-center justify-between mb-8">
                  <div>
                    <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">
                      Tu Energía
                    </h4>
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
                  <button
                    @click="iniciarPago(PRICE_ID_UNICO, 'payment')"
                    class="w-full group relative flex justify-between items-center p-6 bg-slate-800/40 rounded-3xl hover:bg-slate-800/80 transition-all border border-slate-700/50 hover:border-slate-600 shadow-sm overflow-hidden">
                    <div class="text-left relative z-10">
                      <span class="font-bold text-slate-100 block text-lg">Crédito Suelto</span>
                      <span class="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1 block"
                        >Para un presupuesto rápido</span
                      >
                    </div>
                    <div class="flex flex-col items-end relative z-10">
                      <span class="text-xl font-black text-white italic">1,59€</span>
                      <span class="text-[9px] text-indigo-400 font-bold uppercase tracking-tighter"
                        >Sin compromiso</span
                      >
                    </div>
                  </button>

                  <button
                    @click="iniciarPago(PRICE_ID_PRO, 'subscription')"
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
                      <div class="flex items-center gap-3">
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
                              :class="
                                profile?.plan?.toLowerCase() === 'pro'
                                  ? 'text-slate-600'
                                  : 'text-indigo-400/80'
                              ">
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
                    </div>

                    <div class="text-right relative z-10">
                      <div v-if="profile?.plan?.toLowerCase() !== 'pro'" class="flex flex-col">
                        <div class="flex items-start justify-end gap-0.5">
                          <span
                            class="text-3xl font-black text-white italic tracking-tighter transition-transform group-hover:scale-110"
                            >9,99€</span
                          >
                        </div>
                        <span class="text-[10px] text-indigo-400 font-black uppercase tracking-widest mt-1"
                          >Mes + IVA</span
                        >
                      </div>

                      <div v-else class="bg-emerald-500/20 p-2 rounded-full border border-emerald-500/30">
                        <svg
                          class="w-6 h-6 text-emerald-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="3"
                            d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>

                    <div
                      v-if="profile?.plan?.toLowerCase() !== 'pro'"
                      class="absolute inset-0 z-20 pointer-events-none bg-gradient-to-r from-transparent via-white/[0.05] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  </button>
                </div>

                <div v-if="profile?.plan?.toLowerCase() === 'pro'" class="mt-8 space-y-4">
                  <div class="h-px bg-slate-800 w-full"></div>
                  <button
                    @click="abrirPortalGestion"
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
        </div>

        <div class="lg:col-span-8">
          <div
            v-if="presupuesto"
            class="bg-white rounded-[3.5rem] shadow-2xl shadow-slate-200/50 overflow-hidden border border-white animate-in fade-in duration-500">
            <div class="p-10 border-b border-slate-50 bg-slate-50/50 flex justify-between items-start">
              <div>
                <h4 class="text-2xl font-black italic tracking-tighter text-slate-800">
                  {{ configEmpresa.nombre }}
                </h4>
                <p class="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                  {{ configEmpresa.nif }} | {{ configEmpresa.direccion }}
                </p>
              </div>
              <div class="text-right">
                <div
                  class="inline-block bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black uppercase mb-1">
                  Borrador Oficial
                </div>
                <p class="text-xs font-bold text-slate-400">
                  #{{ configEmpresa.id }} • {{ configEmpresa.fecha }}
                </p>
              </div>
            </div>

            <div class="p-10">
              <div class="mb-10 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-2"
                  >Nombre del Cliente</label
                >
                <input
                  v-model="presupuesto.cliente"
                  class="w-full text-2xl font-black bg-transparent border-none outline-none focus:text-indigo-600 transition-colors" />
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-left mb-6">
                  <thead>
                    <tr
                      class="text-[10px] font-black text-slate-300 uppercase tracking-widest border-b border-slate-100">
                      <th class="pb-4 pl-2">Descripción</th>
                      <th class="pb-4 text-center w-20">Cant.</th>
                      <th class="pb-4 text-right w-32">Precio</th>
                      <th class="pb-4 w-12"></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-50">
                    <tr
                      v-for="(item, i) in presupuesto.items"
                      :key="i"
                      class="group hover:bg-slate-50/50 transition-colors">
                      <td class="py-5 pl-2 font-bold text-slate-700">
                        <input
                          v-model="item.desc"
                          class="w-full bg-transparent outline-none focus:text-indigo-600" />
                      </td>
                      <td class="py-5 text-center">
                        <input
                          v-model.number="item.cant"
                          type="number"
                          class="w-12 bg-transparent text-center font-bold text-slate-400 outline-none" />
                      </td>
                      <td class="py-5 text-right font-black text-slate-800">
                        <input
                          v-model.number="item.precio"
                          type="number"
                          class="w-24 bg-transparent text-right outline-none focus:text-indigo-600" />
                      </td>
                      <td class="py-5 text-center">
                        <button
                          @click="eliminarFila(i)"
                          class="text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                          ✕
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="flex justify-between items-center mt-6 pt-6 border-t border-slate-100">
                <button
                  @click="añadirFila"
                  class="px-6 py-3 bg-slate-100 rounded-xl text-[11px] font-black text-slate-500 hover:bg-indigo-600 hover:text-white transition-all tracking-widest uppercase">
                  + Concepto
                </button>
                <div class="text-right">
                  <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                    Total (IVA inc.)
                  </p>
                  <p class="text-4xl font-black text-indigo-600 tracking-tighter">
                    {{ formatCurrency(calculos.total) }}
                  </p>
                </div>
              </div>

              <div class="flex flex-col md:flex-row gap-4 mt-12">
                <button
                  @click="descargarPDF"
                  class="flex-1 bg-slate-100 text-slate-600 p-6 rounded-3xl font-black text-lg hover:bg-slate-200 transition-all flex items-center justify-center gap-3">
                  <span>📥</span> Descargar
                </button>

                <button
                  @click="compartirPDF"
                  class="flex-[2] bg-indigo-600 text-white p-6 rounded-3xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                  <span>🚀</span> Generar y Enviar
                </button>
              </div>
            </div>
          </div>

          <div
            v-else
            class="h-[600px] bg-white rounded-[3.5rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center p-12 text-center">
            <div
              class="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-4xl mb-6 grayscale opacity-50">
              📄
            </div>
            <h3 class="text-2xl font-black text-slate-300 tracking-tighter uppercase">
              Esperando instrucciones...
            </h3>
            <p class="max-w-xs text-sm font-medium text-slate-400 mt-3 leading-relaxed">
              Describe los trabajos escribiendo arriba o pulsando el micrófono.
            </p>
          </div>

          <div v-if="listaPresupuestos.length" class="mt-16">
            <div class="flex items-center justify-between mb-8">
              <div class="flex items-center gap-3 flex-1">
                <h3 class="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">
                  Historial Reciente
                </h3>
                <div class="h-[1px] bg-slate-200 flex-1"></div>
              </div>
              <button
                @click="limpiarTodoElHistorial"
                class="ml-4 text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest transition-colors">
                🗑️ Limpiar todo
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-for="p in listaPresupuestos" :key="p.id" class="relative group">
                <div
                  @click="seleccionarHistorial(p)"
                  :class="
                    idPresupuestoSeleccionado === p.id
                      ? 'border-indigo-500 ring-4 ring-indigo-50'
                      : 'border-white hover:border-indigo-200'
                  "
                  class="bg-white p-6 rounded-[2rem] shadow-sm border-2 cursor-pointer transition-all hover:shadow-md relative overflow-hidden">
                  <div class="flex justify-between items-start pr-8">
                    <p class="font-black text-slate-800 group-hover:text-indigo-600 truncate">
                      {{ p.cliente }}
                    </p>
                    <span class="text-[9px] font-black text-slate-300 uppercase shrink-0">{{
                      new Date(p.created_at).toLocaleDateString()
                    }}</span>
                  </div>

                  <div class="flex justify-between items-end mt-4">
                    <p class="text-xl font-black text-slate-900">
                      {{ formatCurrency(p.total) }}
                    </p>
                    <span
                      class="text-[10px] font-bold text-indigo-500 opacity-0 group-hover:opacity-100 transition-all underline"
                      >Recuperar</span
                    >
                  </div>
                </div>

                <button
                  @click.stop="eliminarPresupuesto(p.id)"
                  class="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white z-10"
                  title="Eliminar presupuesto">
                  <span class="text-xs">✕</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="verConfig"
      class="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-6">
      <div class="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl border border-white">
        <div class="flex justify-between items-center mb-8">
          <h3 class="text-2xl font-black text-indigo-600 italic tracking-tighter">Mi Perfil Fiscal</h3>
          <button
            @click="verConfig = false"
            class="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">
            ✕
          </button>
        </div>
        <div class="space-y-4">
          <input
            v-model="configEmpresa.nombre"
            placeholder="Nombre comercial"
            class="w-full p-5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold" />
          <input
            v-model="configEmpresa.nif"
            placeholder="NIF / CIF"
            class="w-full p-5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold" />
          <input
            v-model="configEmpresa.direccion"
            placeholder="Dirección"
            class="w-full p-5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold" />
        </div>
        <button
          @click="verConfig = false"
          class="w-full mt-10 bg-indigo-600 text-white p-5 rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
          Guardar Cambios
        </button>
      </div>
    </div>
  </div>
  <div v-if="mostrarRecargaMovil" class="relative z-[9999]">
    <div
      @click="mostrarRecargaMovil = false"
      class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9998]"></div>

    <div
      class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[350px] z-[9999] bg-slate-900 rounded-[3rem] p-8 shadow-2xl border border-slate-800">
      <div class="text-center mb-8">
        <h4 class="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-2">
          Energía PresuVoz
        </h4>
        <p class="text-white text-lg font-bold italic">Recargar Créditos</p>
      </div>

      <div class="space-y-4">
        <button
          @click="
            iniciarPago(PRICE_ID_UNICO, 'payment');
            mostrarRecargaMovil = false;
          "
          class="w-full flex justify-between items-center p-6 bg-slate-800/80 rounded-[2rem] border border-slate-700">
          <span class="text-sm font-black text-white italic uppercase">1 Crédito</span>
          <span class="text-xl font-black text-indigo-400">1,59€</span>
        </button>

        <button
          @click="
            iniciarPago(PRICE_ID_PRO, 'subscription');
            mostrarRecargaMovil = false;
          "
          v-if="profile?.plan?.toLowerCase() !== 'pro'"
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
                  <span class="text-xs md:text-sm font-black text-white uppercase tracking-wide">
                    25 Créditos mensuales
                  </span>
                  <span class="text-[10px] text-indigo-200 font-bold uppercase">Uso profesional </span>
                </div>
              </div>

              <div
                class="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-full self-end md:self-center">
                <span class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></span>
                <span class="text-[8px] md:text-[9px] font-black text-white/80 uppercase tracking-widest">
                  Se renuevan cada mes
                </span>
              </div>
            </div>
          </div>

          <div
            class="absolute inset-0 z-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        </button>
      </div>
      <div v-if="profile?.plan?.toLowerCase() === 'pro'" class="mt-8 space-y-4">
        <div class="h-px bg-slate-800 w-full"></div>
        <button
          @click="abrirPortalGestion"
          class="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-[11px] font-black uppercase tracking-[0.15em] text-slate-300">
          <span class="text-lg">⚙️</span> Configurar suscripción
        </button>
      </div>
      <button
        @click="mostrarRecargaMovil = false"
        class="w-full mt-8 py-2 text-[11px] font-black text-slate-500 uppercase tracking-[0.5em]">
        ✕ CERRAR
      </button>
    </div>
  </div>
</template>

<style>
.v-enter-active,
.v-leave-active {
  transition: opacity 0.3s ease;
}
.v-enter-from,
.v-leave-to {
  opacity: 0;
}

input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
</style>
