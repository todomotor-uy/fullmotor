'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AlertCircle, Store } from 'lucide-react'
import { applyForDealership } from '@/lib/dealerships-api'
import { translateApiError } from '@/lib/api-error'
import RequireAuth from '../../components/RequireAuth'
import { useAuth } from '../../components/AuthProvider'
import { Button } from '../../components/ui/Button'
import { Input, Textarea } from '../../components/ui/Input'
import { BIZ, IS_NAUTI } from '@/lib/tenant'
import { Select } from '../../components/ui/Select'
import MapPicker from '../../components/map/MapPicker'
import { UY_DEPARTMENTS, UY_DEPARTMENT_CENTERS, type LatLng } from '@/lib/location'

const COUNTRY = process.env.NEXT_PUBLIC_COUNTRY || 'uy'

function ApplyInner() {
  const router = useRouter()
  const { user } = useAuth()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [department, setDepartment] = useState('')
  const [pin, setPin] = useState<LatLng | null>(null)
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [website, setWebsite] = useState('')
  const [hours, setHours] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const existing = user?.dealership

  // Pending and approved accounts have nothing to do here, and a suspended one
  // must not be able to re-apply its way back in — that is the whole reason
  // suspended and rejected are separate states.
  if (existing && existing.status !== 'rejected') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-ink">
          {existing.status === 'approved'
            ? `Ya tenés un ${BIZ.one}`
            : existing.status === 'pending'
              ? 'Tu solicitud está en revisión'
              : 'Tu cuenta está suspendida'}
        </h1>
        <p className="text-sm text-muted">
          {existing.status === 'approved'
            ? 'Podés editar sus datos desde tu panel.'
            : existing.status === 'pending'
              ? 'Te avisamos en cuanto la revisemos.'
              : 'Escribinos si creés que es un error.'}
        </p>
        {existing.status === 'approved' && (
          <Link href="/comercios/panel" className="text-accent underline">
            Ir a mi panel
          </Link>
        )}
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError(`Poné el nombre de tu ${BIZ.one}.`)
      return
    }
    if (trimmedName.length > 80) {
      setError('El nombre debe tener máximo 80 caracteres.')
      return
    }

    setSubmitting(true)
    try {
      await applyForDealership({
        name: trimmedName,
        countryCode: COUNTRY,
        description: description.trim() || undefined,
        city: city.trim() || undefined,
        address: address.trim() || undefined,
        department: department || undefined,
        ...(pin ? { pin } : {}),
        phone: phone.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
        website: website.trim() || undefined,
        hours: hours.trim() || undefined,
      })
      router.push('/clasificados/mis')
      // Left disabled on purpose: the redirect is in flight and a second
      // submit would collide with the one-application-per-user index.
    } catch (err) {
      setError(translateApiError(err, 'No pudimos enviar tu solicitud'))
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <nav className="iv__crumb mb-3">
          <Link href="/clasificados">Clasificados</Link>
          <span>/</span>
          <span>Registrar {BIZ.one}</span>
        </nav>
        <h1 className="font-display text-3xl font-bold text-ink" style={{ letterSpacing: '-0.03em' }}>
          Registrá tu {BIZ.one}
        </h1>
        <p className="text-sm text-muted mt-2">
          {IS_NAUTI
            ? 'Tu inventario pasa a tener vidriera propia con tu marca y podés subir más fotos por aviso.'
            : 'Tu inventario pasa a tener vidriera propia, tus avisos no vencen y podés subir más fotos por vehículo.'} Revisamos cada solicitud a mano.
        </p>
      </div>

      {existing?.status === 'rejected' && existing.rejectionReason && (
        <div className="p-4 rounded-[var(--radius-md)] bg-sunken text-sm text-body">
          Tu solicitud anterior fue rechazada: {existing.rejectionReason}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-surface border border-line rounded-[var(--radius-lg)] p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-ink">Datos del negocio</h2>

          <Input
            label="Nombre"
            required
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder={IS_NAUTI ? 'Ej. Náutica del Este' : 'Ej. Autos del Sur'}
            hint="Así te van a ver los compradores, y define la dirección de tu vidriera."
          />

          <Textarea
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={4}
            placeholder={`Contá a qué se dedica tu ${BIZ.one}.`}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Departamento"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Elegí el departamento"
              options={[...UY_DEPARTMENTS]}
            />
            <Input
              label="Ciudad o barrio"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              maxLength={100}
              placeholder={IS_NAUTI ? 'Ej. Punta del Este' : 'Ej. Montevideo'}
            />
            <Input
              label="Dirección"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={200}
              placeholder={IS_NAUTI ? 'Ej. Puerto, muelle 3' : 'Ej. Av. Italia 1234'}
            />
          </div>

          <div>
            <p className="tm-field__label mb-2">Ubicación en el mapa</p>
            <MapPicker value={pin} onChange={setPin} subject={`tu ${BIZ.one}`} focus={UY_DEPARTMENT_CENTERS[department] ?? null} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Teléfono"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={40}
              placeholder="+598 2 123 4567"
            />
            <Input
              label="WhatsApp"
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              maxLength={40}
              placeholder="099 123 456"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Sitio web"
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              maxLength={200}
              placeholder="https://…"
            />
            <Input
              label="Horarios"
              type="text"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              maxLength={200}
              placeholder="Lun a vie de 9 a 18, sáb de 9 a 13"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-4 rounded-[var(--radius-md)] bg-danger-soft text-danger-ink text-sm">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" loading={submitting} iconLeft={<Store size={16} aria-hidden="true" />}>
            Enviá tu solicitud
          </Button>
          <Button variant="ghost" onClick={() => router.back()} disabled={submitting}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function ApplyForDealershipPage() {
  return (
    <RequireAuth>
      <ApplyInner />
    </RequireAuth>
  )
}
