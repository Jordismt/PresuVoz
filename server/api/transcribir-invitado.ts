import { defineEventHandler, createError, getHeader, readMultipartFormData } from "h3";
import { validateAudio } from "~~/server/utils/validators";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);

  // 1. IP para el log
  const clientIp = getHeader(event, "x-forwarded-for")?.split(",")[0] || event.node.req.socket.remoteAddress;

  // 2. LEER EL AUDIO
  const parts = await readMultipartFormData(event);
  const audioPart = parts?.find((p) => p.name === "audio");

  if (!audioPart?.data || audioPart.data.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "No se ha recibido audio.",
    });
  }

  // Validamos formato
  validateAudio(audioPart);

  // 3. ENVIAR A GROQ WHISPER
  try {
    const mimeType = audioPart.type || "audio/webm";
    const extMap: Record<string, string> = {
      "audio/webm": "audio.webm",
      "audio/webm;codecs=opus": "audio.webm",
      "audio/mp4": "audio.mp4",
      "audio/ogg": "audio.ogg",
      "audio/wav": "audio.wav",
      "audio/mpeg": "audio.mp3",
    };
    const filename = extMap[mimeType] ?? "audio.webm";

    const formData = new FormData();

    /**
     * SOLUCIÓN AL ERROR DE TIPOS:
     * Convertimos el Buffer a Uint8Array, que es compatible con BlobPart
     */
    const uint8Array = new Uint8Array(audioPart.data);
    const blob = new Blob([uint8Array], { type: mimeType });

    formData.append("file", blob, filename);
    formData.append("model", "whisper-large-v3");
    formData.append("language", "es");
    formData.append("response_format", "json");

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.groqKey}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Error Groq Invitado:", errText);
      throw new Error("Fallo en Groq Whisper");
    }

    const data = await res.json();
    return { texto: data?.text ?? "" };
  } catch (error: any) {
    console.error("Error crítico:", error.message);
    throw createError({
      statusCode: 500,
      statusMessage: "Error en la transcripción: " + error.message,
    });
  }
});
