import Link from 'next/link'
import { Plus } from 'lucide-react'
import { SITE_CONFIG } from '@/lib/tenant'
import UserMenu from '../UserMenu'
import { NautiLogo } from './NautiLogo'
import NautiMobileNav from './NautiMobileNav'

/** Header without the catalogue: no vehicle search, compare or saved list. */
export default function NautiHeader() {
  return (
    <header className="k-header">
      <div className="k-header__in">
        <NautiLogo size={22} className="k-logo" />
        <nav className="k-nav">
          {SITE_CONFIG.nav.map((l) => (
            <Link key={l.href} href={l.href}>{l.label}</Link>
          ))}
        </nav>
        <div className="k-search" aria-hidden="true" />
        <div className="k-actions">
          <Link href="/clasificados/nuevo" className="k-icbtn k-compare">
            <Plus size={17} aria-hidden="true" />
            <span className="k-icbtn__label">Publicar</span>
          </Link>
          <UserMenu />
          <NautiMobileNav />
        </div>
      </div>
    </header>
  )
}
