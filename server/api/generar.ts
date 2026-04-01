import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const body = await readBody(event)
  const { texto } = body

  if (!texto) throw createError({ statusCode: 400, statusMessage: 'Texto vacío' })

  // 1. EXTRAER EL TOKEN
  const authHeader = getHeader(event, 'Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) throw createError({ statusCode: 401, statusMessage: 'No autorizado' })

  // 2. CONECTAR A SUPABASE (Service Role para saltar RLS en perfiles)
  const supabaseAdmin = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey // Asegúrate de tener esto en nuxt.config y .env
  )

  // 3. VALIDAR AL USUARIO
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) throw createError({ statusCode: 401, statusMessage: 'Sesión expirada' })

  // 4. CONSULTAR PERFIL Y LÍMITES
  const { data: profile, error: profError } = await supabaseAdmin
    .from('profiles')
    .select('requests_used, requests_limit, plan')
    .eq('id', user.id)
    .single()

  if (profError || !profile) throw createError({ statusCode: 500, statusMessage: 'Error de perfil' })

  // --- LÓGICA DE CRÉDITOS ACTUALIZADA ---
  // Si ya llegó al límite (ya sean los 5 gratis o los 100 del PRO), bloqueamos.
  if (profile.requests_used >= profile.requests_limit) {
    const mensaje = profile.plan === 'PRO' 
      ? 'Has agotado tus 100 créditos mensuales del Plan PRO.' 
      : 'Has agotado tus créditos gratuitos. Suscríbete al Plan PRO para obtener 100 más.';
    
    throw createError({ statusCode: 403, statusMessage: mensaje })
  }

  // 5. LLAMADA A GROQ
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { 
            role: "system", 
content: `Actúa como un gestor de presupuestos experto. Tu tarea es convertir dictados de voz en JSON profesionales.

REGLAS DE ORO:
1. DESPLAZAMIENTOS: 
   - Si se mencionan kilómetros (ej: "20 km"), usa 1 como "cant" y calcula el precio total como: (Km * 0.60) + 20€ de salida.
   - Ejemplo: "20 km" -> {"desc": "Desplazamiento (20km)", "cant": 1, "precio": 32}
   - Si no mencionan km, usa "cant": 1 y "precio": 30.
   - NUNCA pongas el número de kilómetros en la columna de "precio", pon el resultado del cálculo.

2. MANO DE OBRA Y TRABAJOS:
   - Si no hay precio para una tarea (pintar, arreglar, tejado), estima un precio profesional de mercado.
   - Diferencia bien los conceptos: "Pintado de salón", "Reparación de grifería", "Reparación de cubierta/tejado".

3. PRECIOS Y CANTIDADES:
   - "cant" siempre es un número.
   - "precio" es la BASE IMPONIBLE (sin IVA).
   - Si el dictado es vago, prioriza poner un precio total lógito por el servicio completo en lugar de horas sueltas.

4. FORMATO JSON ESTRICTO:
   {"cliente": string, "items": [{"desc": string, "cant": number, "precio": number}]}

EJEMPLO DE LOGICA:
Entrada: "50 km de desplazamiento y arreglar grifo"
Salida: {
  "cliente": "Carlos",
  "items": [
    {"desc": "Desplazamiento técnico (Larga distancia)", "cant": 1, "precio": 55},
    {"desc": "Mano de obra: Reparación de grifería cocina", "cant": 1, "precio": 45}
  ]
}`
          },
          { role: "user", content: texto }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1 // Bajamos temperatura para ser más precisos con el JSON
      })
    })

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error("La IA no respondió correctamente")

    const cleanJson = JSON.parse(content)

    // 6. ACTUALIZAR CONTADOR (Importante: hacerlo DESPUÉS de que la IA responda con éxito)
    await supabaseAdmin
      .from('profiles')
      .update({ requests_used: profile.requests_used + 1 })
      .eq('id', user.id)

    return cleanJson

  } catch (error: any) {
    throw createError({ statusCode: 500, statusMessage: 'Error procesando presupuesto: ' + error.message })
  }
})