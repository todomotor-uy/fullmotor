'use client'

import { LogOut, ShieldAlert } from 'lucide-react'
import AuthProvider, { GoogleButton, useAuth } from './AuthProvider'
import Panel from './Panel'
import { Button } from './ui/Button'

function Card({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-surface border border-line rounded-[var(--radius-xl)] p-8 max-w-sm w-full shadow-pop text-center">
        {children}
      </div>
    </main>
  )
}

function Screen() {
  const { status, user, error, logout } = useAuth()

  if (status === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center" aria-busy="true">
        <span className="tm-btn__spinner text-muted" aria-label="Cargando" />
      </main>
    )
  }

  if (status === 'signed-out' || !user) {
    return (
      <Card>
        <p className="tm-eyebrow mb-2">Vitri</p>
        <h1 className="font-display text-xl font-bold text-ink mb-2">Superadmin</h1>
        <p className="text-sm text-muted mb-6">Métricas, errores y comentarios de todos los sitios.</p>
        <div className="flex justify-center">
          <GoogleButton />
        </div>
        {error && <p className="text-sm text-danger-ink mt-4">{error}</p>}
      </Card>
    )
  }

  // The API refuses anyone else anyway; this spares them a screen of 403s.
  if (!user.superAdmin) {
    return (
      <Card>
        <ShieldAlert size={28} className="mx-auto text-danger-ink mb-3" aria-hidden="true" />
        <h1 className="font-display text-xl font-bold text-ink mb-2">No tenés acceso</h1>
        <p className="text-sm text-muted mb-6">
          {user.email} no es superadmin. Si debería serlo, hay que sumarlo a SUPERADMIN_EMAILS en la API.
        </p>
        <Button variant="secondary" size="sm" onClick={logout} iconLeft={<LogOut size={14} aria-hidden="true" />}>
          Usar otra cuenta
        </Button>
      </Card>
    )
  }

  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <p className="font-display font-bold text-ink">
            Vitri <span className="text-muted font-medium">· superadmin</span>
          </p>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm text-muted truncate hidden sm:inline">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={logout} iconLeft={<LogOut size={14} aria-hidden="true" />}>
              Salir
            </Button>
          </div>
        </div>
      </header>
      <Panel />
    </>
  )
}

export default function Gate() {
  return (
    <AuthProvider>
      <Screen />
    </AuthProvider>
  )
}
