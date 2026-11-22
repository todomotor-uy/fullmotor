import Link from 'next/link'
import { Logo } from './ui/Logo'
import { IS_NAUTI } from '@/lib/tenant'
import NautiFooter from './nauti/NautiFooter'

export default function SiteFooter() {
  if (IS_NAUTI) return <NautiFooter />
  return (
    <footer className="k-footer">
      <div className="k-footer__in">
        <div style={{ maxWidth: 280 }}>
          <Logo size={20} inverse />
          <p style={{ color: 'var(--text-inverse-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6, marginTop: 14 }}>
            Fichas técnicas, precios y comparativas de vehículos en Uruguay. Información de referencia para decidir mejor.
          </p>
        </div>
        <div className="k-footer__cols">
          <div className="k-footer__col">
            <h5>Catálogo</h5>
            <Link href="/vehiculos?category=autos">Autos</Link>
            <Link href="/vehiculos?category=suvs">SUVs</Link>
            <Link href="/vehiculos?category=pickups">Camionetas</Link>
            <Link href="/vehiculos?category=motos">Motos</Link>
            <Link href="/vehiculos?category=utilitarios">Utilitarios</Link>
            {/* The only site-wide link into the brand pages. Without it they
                are reachable from a vehicle breadcrumb and the sitemap only. */}
            <Link href="/marcas">Todas las marcas</Link>
          </div>
          <div className="k-footer__col">
            <h5>TodoMotor</h5>
            <Link href="/blog">Blog del Motor</Link>
            <Link href="/guia-de-compra">Guía de compra</Link>
            <Link href="/compare">Comparador</Link>
            <Link href="/clasificados">Clasificados</Link>
            <Link href="/automotoras">Automotoras</Link>
            <a href="mailto:contacto@todomotor.uy">Escribinos</a>
          </div>
          {/* The advertising policy lives in the footer rather than buried in a
              legal page nobody links to: it is the public promise that the
              buying guide ranking is not for sale, and it only works as a
              promise if it is easy to find. */}
          <div className="k-footer__col">
            <h5>Legal</h5>
            <Link href="/privacidad">Privacidad</Link>
            <Link href="/politica-publicitaria">Política publicitaria</Link>
            <a href="mailto:contacto@todomotor.uy?subject=Publicidad%20en%20TodoMotor">Anunciá acá</a>
          </div>
        </div>
      </div>
      <div className="k-footer__bottom">
        <div className="in">
          <span>© {new Date().getFullYear()} TodoMotor Uruguay · Información de referencia</span>
          <span>Hecho en Montevideo, Uruguay</span>
        </div>
      </div>
    </footer>
  )
}
