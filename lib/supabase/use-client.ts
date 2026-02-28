'use client'

import { useMemo } from 'react'
import { createClient } from './client'

/**
 * Hook para obtener el cliente de Supabase en componentes de React.
 * Memoiza el cliente para evitar recrearlo en cada render.
 */
export function useSupabase() {
  return useMemo(() => createClient(), [])
}

