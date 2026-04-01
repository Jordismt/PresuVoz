// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

let _supabase: any = null

export const getSupabase = () => {
  if (!_supabase) {
    const config = useRuntimeConfig()
    const supabaseUrl = config.public.supabaseUrl
    const supabaseKey = config.public.supabaseAnonKey

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Faltan las variables de entorno de Supabase en .env')
    }
    _supabase = createClient(supabaseUrl, supabaseKey)
  }
  return _supabase
}

// Exportamos un objeto que se comporta como el cliente, 
// pero solo inicializa cuando se pide por primera vez.
export const supabase = {
  get auth() { return getSupabase().auth },
  from(table: string) { return getSupabase().from(table) },
  // Si usas más funciones como .storage o .rpc, añádelas aquí:
  get storage() { return getSupabase().storage }
}