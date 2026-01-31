"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export function useLiveLeads(){
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function load(){
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setRows(data)
    setLoading(false)
  }

  useEffect(() => {
    let mounted = true
    load()
    const ch = supabase.channel('leads_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => mounted && load())
      .subscribe()
    return () => { mounted = false; supabase.removeChannel(ch) }
  }, [])

  return { rows, loading }
}

