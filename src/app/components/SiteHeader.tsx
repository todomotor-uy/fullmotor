import Link from 'next/link'
import { Suspense } from 'react'
import { GitCompareArrows } from 'lucide-react'
import { Logo } from './ui/Logo'
import HeaderSearch from './HeaderSearch'
import SavedHeaderButton from './SavedHeaderButton'
import UserMenu from './UserMenu'
import MobileNav from './MobileNav'
import { IS_NAUTI } from '@/lib/tenant'
import NautiHeader from './nauti/NautiHeader'

export default function SiteHeader() {
  if (IS_NAUTI) return <NautiHeader />
  return (
    <header className="k-header">
      <div className="k-header__in">
        <Logo size={22} className="k-logo" />
        <nav className="k-nav">
          <Link href="/vehiculos">Vehículos</Link>
          <Link href="/guia-de-compra">Guía de compra</Link>
          <Link href="/clasificados">Clasificados</Link>
          <Link href="/comercios">Comercios</Link>
          <Link href="/blog">Blog</Link>
        </nav>
        <Suspense fallback={<div className="k-search" />}>
          <HeaderSearch />
        </Suspense>
        <div className="k-actions">
          <Link href="/compare" className="k-icbtn k-compare">
            <GitCompareArrows size={17} aria-hidden="true" />
            <span className="k-icbtn__label">Comparar</span>
          </Link>
          <SavedHeaderButton />
          <UserMenu />
          <MobileNav />
        </div>
      </div>
    </header>
  )
}
