import type { MetadataRoute } from 'next'
import { IS_NAUTI } from '@/lib/tenant'

export default function manifest(): MetadataRoute.Manifest {
  if (IS_NAUTI) {
    return {
      name: 'Nauti',
      short_name: 'Nauti',
      description: 'Clasificados y noticias de la náutica uruguaya.',
      start_url: '/',
      display: 'standalone',
      background_color: '#F4F8F9',
      theme_color: '#0E7C86',
      icons: [{ src: '/brand/nauti-mark.svg', sizes: 'any', type: 'image/svg+xml' }],
    }
  }
  return {
    name: 'TodoMotor Uruguay',
    short_name: 'TodoMotor',
    description: 'Fichas t\u00e9cnicas de veh\u00edculos en Uruguay. Autos, SUVs, camionetas y motos.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F6F8FB',
    theme_color: '#1F4FE0',
    icons: [
      {
        src: '/brand/todomotor-mark.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}
