import Link from 'next/link'
import { Suspense } from 'react'
import { GitCompareArrows } from 'lucide-react'
import { Logo } from './ui/Logo'
import HeaderSearch from './HeaderSearch'
import SavedHeaderButton from './SavedHeaderButton'
import UserMenu from './UserMenu'
import MobileNav from './MobileNav'
import { IS_NAUTI } from '@/lib/tenant'
import { getSiteSettings } from '@/lib/site-settings.server'
import { hasModule, siteNav } from '@/lib/site-settings'
import NautiHeader from './nauti/NautiHeader'

export default async function SiteHeader() {
  if (IS_NAUTI) return <NautiHeader />
  const settings = await getSiteSettings()
  const catalog = hasModule(settings, 'catalog')
  return (
    <header className="k-header">
      <div className="k-header__in">
        <Logo size={22} className="k-logo" />
        <nav className="k-nav">
          {siteNav(settings).map((l) => (
            <Link key={l.href} href={l.href}>{l.label}</Link>
          ))}
        </nav>
        {catalog ? (
          <Suspense fallback={<div className="k-search" />}>
            <HeaderSearch />
          </Suspense>
        ) : (
          <div className="k-search" aria-hidden="true" />
        )}
        <div className="k-actions">
          {catalog && (
            <>
              <Link href="/compare" className="k-icbtn k-compare">
                <GitCompareArrows size={17} aria-hidden="true" />
                <span className="k-icbtn__label">Comparar</span>
              </Link>
              <SavedHeaderButton />
            </>
          )}
          <UserMenu />
          <MobileNav />
        </div>
      </div>
    </header>
  )
}
