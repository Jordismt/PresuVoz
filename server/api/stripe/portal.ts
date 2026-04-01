import Stripe from 'stripe'
import { defineEventHandler, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const authHeader = getHeader(event, 'Authorization')
  
  if (!authHeader) throw createError({ statusCode: 401, message: 'No autorizado' })

  const supabase = createClient(process.env.NUXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)

  if (!user) throw createError({ statusCode: 401, message: 'Usuario no encontrado' })

  // Buscamos su customer ID de Stripe
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (!profile?.stripe_customer_id) {
    throw createError({ statusCode: 400, message: 'No tienes una suscripción activa' })
  }

  // Creamos la sesión del portal
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${process.env.PUBLIC_BASE_URL || 'http://localhost:3000'}/profile`,
  })

  return { url: session.url }
})