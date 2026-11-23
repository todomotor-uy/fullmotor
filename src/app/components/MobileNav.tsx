'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { Menu, X, GitCompareArrows } from 'lucide-react'

export default function MobileNav() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
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
          <Link href="/vehiculos">Vehículos</Link>
          <Link href="/guia-de-compra">Guía de compra</Link>
          <Link href="/clasificados">Clasificados</Link>
          <Link href="/comercios">Comercios</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/compare" className="k-menu__with-icon">
            <GitCompareArrows size={16} aria-hidden="true" />
            Comparar
          </Link>
        </nav>
      )}
    </div>
  )
}
