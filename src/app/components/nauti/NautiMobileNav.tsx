'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { SITE_CONFIG } from '@/lib/tenant'

export default function NautiMobileNav() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="k-mobilenav" ref={ref}>
      <button
        type="button"
        className="k-icbtn k-menu-btn"
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
      </button>

      {open && (
        <nav className="k-menu" onClick={() => setOpen(false)}>
          {SITE_CONFIG.nav.map((l) => (
            <Link key={l.href} href={l.href}>{l.label}</Link>
          ))}
          <Link href="/clasificados/nuevo">Publicar</Link>
        </nav>
      )}
    </div>
  )
}
