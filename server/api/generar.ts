import { defineEventHandler, readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const { texto } = await readBody(event)

  if (!config.groqKey) {
    throw createError({ statusCode: 500, statusMessage: 'API Key no configurada' })
  }

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
    content: `Actúa como un experto en facturación y ERP. Tu misión es transformar texto desestructurado en un presupuesto profesional.
    
    REGLAS DE ORO:
    1. CLIENTE: Si no se menciona, usa "CLIENTE FINAL".
    2. DESGLOSE: Separa siempre la "Mano de obra" de los "Materiales" si el texto lo permite.
    3. PRECIOS COHERENTES: Si el usuario NO menciona precios, usa valores de mercado estándar (ej: Enchufe 15€, Mano de obra punto luz 45€). Nunca devuelvas 0€ si hay una descripción.
    4. CÁLCULO: Asegúrate de que (cant * precio) sea igual al total de la línea.
    5. FORMATO: Devuelve ÚNICAMENTE un objeto JSON puro, sin texto adicional, Markdown ni explicaciones.

    JSON Estructura:
    {
      "cliente": "Nombre",
      "fecha": "${new Date().toLocaleDateString('es-ES')}",
      "items": [
        {"desc": "Descripción técnica", "cant": 1, "precio": 0, "total": 0}
      ]
    }`
  },
  { role: "user", content: texto }
],
        response_format: { type: "json_object" },
        temperature: 0.1 // Menos creatividad, más precisión
      })
    })

    const data = await response.json()
    return JSON.parse(data.choices[0].message.content)
  } catch (error) {
    throw createError({ statusCode: 500, statusMessage: 'Error en el motor de IA' })
  }
})