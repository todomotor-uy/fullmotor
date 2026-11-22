import { OG_SIZE, OG_CONTENT_TYPE, renderOgImage } from '@/lib/og'
import { IS_NAUTI } from '@/lib/tenant'

export const alt = IS_NAUTI
  ? 'Nauti — Clasificados y noticias de la náutica uruguaya'
  : 'TodoMotor Uruguay — Fichas técnicas de vehículos'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function OpengraphImage() {
  if (IS_NAUTI) {
    return renderOgImage({
      eyebrow: 'Náutica en Uruguay',
      title: 'Lanchas, veleros y motos de agua: comprá y vendé',
      subtitle: 'Clasificados gratis y noticias de la náutica uruguaya.',
    })
  }
  return renderOgImage({
    eyebrow: 'Uruguay',
    title: 'Fichas técnicas de autos, SUVs, camionetas y motos',
    subtitle: 'Especificaciones, precios y equipamiento del mercado uruguayo.',
  })
}
