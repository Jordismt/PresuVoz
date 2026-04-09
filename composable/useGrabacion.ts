import { ref, nextTick } from "vue";
import { supabase } from "~/lib/supabase";

export function useGrabacion(transcripcion: Ref<string>) {
  const grabando = ref(false);
  const textoEnVivo = ref("");
  const cargandoIA = ref(false);

  let recognition: any = null;
  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: Blob[] = [];

  // ── Detección de plataforma ────────────────────────────────────────────
  const esIOS = (): boolean => /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const esCriOS = (): boolean => /CriOS/.test(navigator.userAgent);
  const esFxiOS = (): boolean => /FxiOS/.test(navigator.userAgent);
  const esPWA = (): boolean =>
    window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
  const tieneSpeechRecognition = (): boolean =>
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const necesitaWhisper = (): boolean => {
    if (!process.client) return false;
    if (esIOS() && (esCriOS() || esFxiOS())) return true;
    if (esIOS() && esPWA()) return true;
    if (!tieneSpeechRecognition()) return true;
    return false;
  };

  // ── RUTA A: MediaRecorder → Groq Whisper ──────────────────────────────
  const toggleGrabacionWhisper = async () => {
    if (grabando.value) {
      grabando.value = false;
      mediaRecorder?.stop();
      textoEnVivo.value = "";
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "";

      mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (audioChunks.length === 0) return;

        const finalMime = mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunks, { type: finalMime });

        cargandoIA.value = true;
        try {
          // 1. Miramos si hay sesión real
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const tieneToken = session?.access_token && session.access_token.length > 50;

          const formData = new FormData();
          formData.append("audio", audioBlob, finalMime.includes("mp4") ? "audio.mp4" : "audio.webm");

          // 2. Elegimos la ruta: si no hay token, a la de invitado
          const endpoint = tieneToken ? "/api/transcribir" : "/api/transcribir-invitado";

          const res = await fetch(endpoint, {
            method: "POST",
            headers: {
              // SOLO enviamos el header si el token es de verdad
              ...(tieneToken ? { Authorization: `Bearer ${session.access_token}` } : {}),
            },
            body: formData,
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.statusMessage || "Error al transcribir");
          }

          const { texto } = await res.json();
          if (texto) {
            // Unimos el texto nuevo a lo que ya hubiera
            transcripcion.value += (transcripcion.value ? " " : "") + texto.trim() + ". ";
          }
        } catch (e: any) {
          console.error("Fallo en transcripción:", e);
          alert("❌ Error transcribiendo: " + e.message);
        } finally {
          cargandoIA.value = false;
        }
      };

      mediaRecorder.start(1000);
      grabando.value = true;
      textoEnVivo.value = "🎙️ Grabando... (el texto aparecerá al parar)";
    } catch (e: any) {
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        alert("⚠️ Permiso de micrófono denegado.\n\nVe a Ajustes > [Navegador] > Micrófono y actívalo.");
      } else {
        alert("❌ No se pudo acceder al micrófono: " + e.name);
      }
      grabando.value = false;
    }
  };

  // ── RUTA B: SpeechRecognition con texto en vivo ───────────────────────
  const toggleGrabacionSpeech = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (grabando.value) {
      grabando.value = false;
      try {
        recognition?.stop();
      } catch (_) {}
      recognition = null;
      textoEnVivo.value = "✅ Listo para generar";
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = "es-ES";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (e: any) => {
      let textoSesionActual = "";
      for (let i = 0; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal && result[0].confidence > 0) {
          const transcript = result[0].transcript.trim();
          if (!textoSesionActual.toLowerCase().includes(transcript.toLowerCase())) {
            textoSesionActual += (textoSesionActual ? " " : "") + transcript;
          }
        }
      }
      if (textoSesionActual.trim() !== "") {
        transcripcion.value = textoSesionActual.charAt(0).toUpperCase() + textoSesionActual.slice(1) + ". ";
      }
      nextTick(() => {
        if (grabando.value) textoEnVivo.value = "🎙️ Escuchando...";
      });
    };

    const estaInstancia = recognition;

    recognition.onend = () => {
      if (!grabando.value) {
        nextTick(() => {
          textoEnVivo.value = "✅ Listo para generar";
        });
        return;
      }
      setTimeout(() => {
        if (grabando.value && recognition === estaInstancia) {
          try {
            estaInstancia.start();
          } catch (_) {}
        }
      }, 300);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        grabando.value = false;
        textoEnVivo.value = "";
        alert("⚠️ Micrófono bloqueado.");
      }
    };

    transcripcion.value = "";
    textoEnVivo.value = "⏳ Conectando...";

    try {
      recognition.start();
      grabando.value = true;
    } catch (e) {
      grabando.value = false;
      recognition = null;
      textoEnVivo.value = "";
    }
  };

  // ── FUNCIÓN PRINCIPAL ─────────────────────────────────────────────────
  const toggleGrabacion = () => {
    if (!process.client) return;
    if (necesitaWhisper()) {
      toggleGrabacionWhisper();
    } else {
      toggleGrabacionSpeech();
    }
  };

  return {
    grabando,
    textoEnVivo,
    cargandoIA,
    toggleGrabacion,
  };
}
