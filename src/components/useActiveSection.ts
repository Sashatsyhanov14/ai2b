"use client"
import { useEffect, useState } from 'react'

export function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0])
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a,b)=> (b.intersectionRatio - a.intersectionRatio))[0]
        if (visible?.target && (visible.target as HTMLElement).id) {
          setActive((visible.target as HTMLElement).id)
        }
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: [0.1,0.25,0.5,0.75] }
    )
    ids.forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [ids])
  return active
}

