import { ref, onMounted } from 'vue'
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js' // <--- Importamos los tipos
import { getSupabase } from '~/lib/supabase'

export const user = ref<User | null>(null)
export const profile = ref<any>(null)
export const loadingUser = ref(true)

export function useUser() {
  const client = getSupabase()

  const fetchUser = async () => {
    const { data: { user: u } } = await client.auth.getUser()
    user.value = u

    if (u) {
      const { data: p } = await client
        .from('profiles')
        .select('*')
        .eq('id', u.id)
        .single()
      profile.value = p
    } else {
      profile.value = null
    }

    loadingUser.value = false
  }

  onMounted(fetchUser)

  // Tipamos los parámetros del callback:
  client.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
    user.value = session?.user ?? null
    if (session?.user) {
      fetchUser()
    } else {
      profile.value = null
      loadingUser.value = false
    }
  })

  return { user, profile, loadingUser }
}