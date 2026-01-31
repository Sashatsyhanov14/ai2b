"use client"
import { useEffect, useState } from 'react'

export function useLiveRentalUnits(){
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function load(){
    const res = await fetch('/api/units?type=rent')
    const j = await res.json().catch(()=>({}))
    if (j && Array.isArray(j.units)) setRows(j.units)
    setLoading(false)
  }

  useEffect(()=>{ let alive=true; load(); return ()=>{ alive=false } },[])

  return { rows, loading }
}
