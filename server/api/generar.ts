import { defineEventHandler, readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
  // 1. Cargamos las variables de entorno de Vercel
  const config = useRuntimeConfig(event)
  
  // 2. Extraemos el texto Y la licencia que envía el usuario desde el frontend
  const { texto, licenciaUsuario } = await readBody(event)

  // --- CONTROL DE SEGURIDAD (EL PORTERO) ---
  // Comparamos la licencia que escribió el usuario con la que tú pusiste en Vercel
  // IMPORTANTE: En Vercel la variable debe llamarse CODIGO_LICENCIA
  if (!licenciaUsuario || licenciaUsuario !== config.codigoLicencia) {
    throw createError({ 
      statusCode: 403, 
      statusMessage: 'ACCESO DENEGADO: Licencia no válida o expirada.' 
    })
  }

  // Si no hay API Key de Groq configurada en Vercel
  if (!config.groqKey) {
    throw createError({ 
      statusCode: 500, 
      statusMessage: 'Error interno: API Key no configurada' 
    })
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
            3. PRECIOS COHERENTES: Si el usuario NO menciona precios, usa valores de mercado estándar.
            4. CÁLCULO: (cant * precio) = total.
            5. FORMATO: JSON puro.

            JSON Estructura:
            {
              "cliente": "Nombre",
              "items": [
                {"desc": "Descripción técnica", "cant": 1, "precio": 0}
              ]
            }`
          },
          { role: "user", content: texto }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    })

    const data = await response.json()
    
    // Limpiamos el contenido por si la IA devuelve Markdown
    const content = data.choices[0].message.content
    const cleanJson = content.replace(/```json|```/g, "").trim()
    
    return JSON.parse(cleanJson)

  } catch (error) {
    throw createError({ 
      statusCode: 500, 
      statusMessage: 'Error en el motor de IA al procesar el presupuesto' 
    })
  }
})