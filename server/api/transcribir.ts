import { defineEventHandler, createError, getHeader, readMultipartFormData } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  // 1. AUTH — mismo patrón que generar.ts
  const token = getHeader(event, 'Authorization')?.replace('Bearer ', '')
  if (!token) throw createError({ statusCode: 401, statusMessage: 'No autorizado' })

  const supabaseAdmin = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey
  )

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) throw createError({ statusCode: 401, statusMessage: 'Sesión expirada' })

  // 2. LEER EL AUDIO DEL BODY (multipart/form-data)
  const parts = await readMultipartFormData(event)
  const audioPart = parts?.find(p => p.name === 'audio')

  if (!audioPart?.data || audioPart.data.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No se recibió audio' })
  }

  // 3. ENVIAR A GROQ WHISPER
  try {
    const mimeType = audioPart.type || 'audio/webm'

    // Determinamos extensión según el tipo MIME para que Groq lo acepte
    const extMap: Record<string, string> = {
      'audio/webm': 'audio.webm',
      'audio/webm;codecs=opus': 'audio.webm',
      'audio/mp4': 'audio.mp4',
      'audio/ogg': 'audio.ogg',
      'audio/wav': 'audio.wav',
    }
    const filename = extMap[mimeType] ?? 'audio.webm'

    const formData = new FormData()
    const blob = new Blob([audioPart.data.buffer as ArrayBuffer], { type: mimeType })
    formData.append('file', blob, filename)
    formData.append('model', 'whisper-large-v3')
    formData.append('language', 'es')
    formData.append('response_format', 'json')

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.groqKey}`,
        // NO pongas Content-Type aquí, fetch lo pone solo con el boundary correcto
      },
      body: formData,
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Groq Whisper error:', errText)
      throw new Error('Groq Whisper falló: ' + errText)
    }

    const data = await res.json()
    const texto = data?.text ?? ''

    return { texto }

  } catch (error: any) {
    throw createError({ statusCode: 500, statusMessage: 'Error transcribiendo audio: ' + error.message })
  }
})