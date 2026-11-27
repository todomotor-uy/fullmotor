import { OG_SIZE, OG_CONTENT_TYPE, renderOgImage } from '@/lib/og'
import { IS_NAUTI } from '@/lib/tenant'

export const alt = IS_NAUTI ? 'Noticias náuticas en Uruguay — Cardinal Sur' : 'Noticias del motor en Uruguay — TodoMotor'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function BlogOpengraphImage() {
  if (IS_NAUTI) {
    return renderOgImage({
      eyebrow: 'Blog náutico',
      title: 'Noticias y novedades de la náutica en Uruguay',
      subtitle: 'Regatas, temporada, puertos y guías para navegar.',
    })
  }
  return renderOgImage({
    eyebrow: 'Blog del Motor',
    title: 'Noticias y novedades del motor en Uruguay',
    subtitle: 'Lanzamientos, precios, impuestos y guías para comprar mejor.',
  })
}
