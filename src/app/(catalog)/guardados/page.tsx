import type { Metadata } from 'next'
import SavedList from '@/app/components/SavedList'

export const metadata: Metadata = {
  title: 'Guardados',
  description: 'Tus vehículos guardados en TodoMotor.',
  robots: { index: false, follow: false },
}

export default function GuardadosPage() {
  return (
    <div className="iv" style={{ paddingBottom: 24 }}>
      <h1 className="iv__title">Guardados</h1>
      <p className="iv__count" style={{ marginBottom: 24 }}>Tus vehículos marcados con el corazón, guardados en este navegador.</p>
      <SavedList />
    </div>
  )
}
