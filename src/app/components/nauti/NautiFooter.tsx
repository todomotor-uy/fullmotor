import Link from 'next/link'
import { SITE_CONFIG } from '@/lib/tenant'
import { getSiteSettings } from '@/lib/site-settings.server'
import { hasModule } from '@/lib/site-settings'
import { NautiLogo } from './NautiLogo'

export default async function NautiFooter() {
  const settings = await getSiteSettings()
  const on = (m: Parameters<typeof hasModule>[1]) => hasModule(settings, m)
  const email = SITE_CONFIG.contactEmail
  return (
    <footer className="k-footer">
      <div className="k-footer__in">
        <div style={{ maxWidth: 280 }}>
          <NautiLogo size={20} inverse />
          <p style={{ color: 'var(--text-inverse-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6, marginTop: 14 }}>
            Clasificados y noticias de la náutica uruguaya. Lanchas, veleros, motos de agua y todo lo que flota.
          </p>
        </div>
        <div className="k-footer__cols">
          {on('classifieds') && (
            <div className="k-footer__col">
              <h5>Clasificados</h5>
              {settings.categories.slice(0, 5).map((c) => (
                <Link key={c.key} href={`/clasificados?category=${c.key}`}>{c.label}</Link>
              ))}
            </div>
          )}
          <div className="k-footer__col">
            <h5>Nauti</h5>
            {on('news') && <Link href="/blog">Novedades</Link>}
            {on('events') && <Link href="/eventos">Eventos</Link>}
            {on('classifieds') && <Link href="/clasificados">Todos los clasificados</Link>}
            {on('classifieds') && <Link href="/clasificados/nuevo">Publicar un aviso</Link>}
            {on('storefronts') && <Link href="/comercios">Comercios</Link>}
            <a href={`mailto:${email}`}>Escribinos</a>
          </div>
          <div className="k-footer__col">
            <h5>Legal</h5>
            <Link href="/privacidad">Privacidad</Link>
          </div>
        </div>
      </div>
      <div className="k-footer__bottom">
        <div className="in">
          <span>© {new Date().getFullYear()} Nauti · Náutica en Uruguay</span>
          <span>Hecho en Montevideo, Uruguay</span>
        </div>
      </div>
    </footer>
  )
}
