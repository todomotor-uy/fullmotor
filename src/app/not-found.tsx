import Link from 'next/link'
import { CATEGORIES } from '@/types/vehicle'
import { Mark } from './components/ui/Logo'
import { ButtonLink } from './components/ui/Button'
import { IS_NAUTI } from '@/lib/tenant'
import { NAUTICAL_CATEGORIES } from '@/types/classified'
import { NautiMark } from './components/nauti/NautiLogo'

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      <div className="flex justify-center mb-6">
        {IS_NAUTI ? <NautiMark size={72} /> : <Mark size={72} />}
      </div>
      <h1 className="font-mono text-5xl font-medium text-ink tracking-tight mb-4">404</h1>
      <p className="text-lg text-muted mb-8">
        Esta página no existe o fue movida. Volvé al inicio o buscá {IS_NAUTI ? 'en los clasificados' : 'un vehículo'}.
      </p>

      <ButtonLink href="/" size="lg">Ir al inicio</ButtonLink>

      <div className="mt-12 pt-8 border-t border-hairline">
        <p className="text-sm text-muted mb-4">O explorá por categoría:</p>
        <div className="flex flex-wrap justify-center gap-3">
          {IS_NAUTI
            ? NAUTICAL_CATEGORIES.map((cat) => (
                <Link key={cat.id} href={`/clasificados?category=${cat.id}`} className="tm-chip">
                  {cat.label}
                </Link>
              ))
            : CATEGORIES.map((cat) => (
                <Link key={cat.id} href={`/vehiculos?category=${cat.id}`} className="tm-chip">
                  {cat.name}
                </Link>
              ))}
        </div>
      </div>
    </div>
  )
}
