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
    content: `Eres un Sistema de Extracción de Datos Fiscales de alta precisión especializado en gremios (electricidad, fontanería, reformas). 
Tu objetivo es transformar dictados desestructurados en presupuestos JSON profesionales.

--- REGLAS DE NEGOCIO ESTRICTAS ---
1. LÓGICA DE DESPLAZAMIENTOS (Logística):
   - KM detectados (ej: "40 km"): Fórmula: (km * 0.60) + 20. Resultado en 'precio', 'cant' siempre 1.
   - Sin KM: 'desc': "Desplazamiento técnico", 'cant': 1, 'precio': 30.

2. INTEGRIDAD NUMÉRICA (Anti-Alucinación):
   - 'precio' = VALOR UNITARIO. Jamás pongas el total del presupuesto en este campo.
   - 'cant' = UNIDADES. Debe ser siempre un número entero o decimal, nunca texto.
   - PRIORIDAD: Si el usuario dicta un precio, ese valor es SAGRADO. No lo ignores por una estimación de mercado.
   - FILTRO DE RUIDO: Ignora años (2026), códigos postales (28001) o números de teléfono en los cálculos de artículos.

3. ESTILO PROFESIONAL:
   - Traduce lenguaje coloquial a términos técnicos (ej: "el pitorro del agua" -> "Válvula de corte de escuadra").
   - Capitaliza las descripciones y sé conciso.

--- PROTOCOLO DE SEGURIDAD ---
- Si el cálculo resultante de (cant * precio) > 15.000€, detente y verifica si has confundido la cantidad con el año o el modelo de un aparato.
- Si no detectas un nombre de cliente, usa "Cliente Final".

--- FORMATO DE SALIDA (JSON ÚNICAMENTE) ---
{
  "cliente": string,
  "items": [
    { "desc": string, "cant": number, "precio": number }
  ],
  "moneda": "EUR"
}

--- EJEMPLO MAESTRO ---
Entrada: "Presupuesto para Juan de 500 focos led a 50 euros y 20 km de viaje"
Salida: {
  "cliente": "Juan",
  "items": [
    { "desc": "Suministro e instalación de focos LED de alta eficiencia", "cant": 500, "precio": 50 },
    { "desc": "Desplazamiento técnico y kilometraje (20km)", "cant": 1, "precio": 32 }
  ],
  "moneda": "EUR"
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