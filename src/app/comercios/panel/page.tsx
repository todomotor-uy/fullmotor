'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AlertCircle, CheckCircle, ExternalLink } from 'lucide-react'
import { updateMyDealership, uploadMyDealershipImage } from '@/lib/dealerships-api'
import { translateApiError } from '@/lib/api-error'
import RequireAuth from '../../components/RequireAuth'
import { useAuth } from '../../components/AuthProvider'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Input, Textarea } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import MapPicker from '../../components/map/MapPicker'
import { RichEditor } from '../../components/editor/RichEditor'
import ImageUploadField from '../../components/editor/ImageUploadField'
import { UY_DEPARTMENTS, UY_DEPARTMENT_CENTERS, pinOf, type LatLng } from '@/lib/location'

function PanelInner() {
  const { user } = useAuth()
  const dealership = user?.dealership

  const [name, setName] = useState(dealership?.name ?? '')
  const [description, setDescription] = useState(dealership?.description ?? '')
  const [city, setCity] = useState(dealership?.city ?? '')
  const [address, setAddress] = useState(dealership?.address ?? '')
  const [department, setDepartment] = useState(dealership?.department ?? '')
  const [pin, setPin] = useState<LatLng | null>(dealership ? pinOf(dealership) : null)
  const [phone, setPhone] = useState(dealership?.phone ?? '')
  const [whatsapp, setWhatsapp] = useState(dealership?.whatsapp ?? '')
  const [website, setWebsite] = useState(dealership?.website ?? '')
  const [hours, setHours] = useState(dealership?.hours ?? '')
  const [logoUrl, setLogoUrl] = useState(dealership?.logoUrl ?? '')
  const [coverImage, setCoverImage] = useState(dealership?.coverImage ?? '')
  const [pageMarkdown, setPageMarkdown] = useState(dealership?.pageMarkdown ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  if (!dealership) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-ink">Todavía no tenés un comercio</h1>
        <p className="text-sm text-muted">Registrate y revisamos tu solicitud a mano.</p>
        <ButtonLink href="/comercios/solicitar">Registrá tu comercio</ButtonLink>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaved(false)

    if (!name.trim()) {
      setError('El nombre no puede quedar vacío.')
      return
    }

    setSaving(true)
    try {
      await updateMyDealership({
        name: name.trim(),
        description: description.trim(),
        city: city.trim(),
        address: address.trim(),
        department,
        pin,
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        website: website.trim(),
        hours: hours.trim(),
        logoUrl,
        coverImage,
        pageMarkdown,
      })
      setSaved(true)
    } catch (err) {
      setError(translateApiError(err, 'No pudimos guardar los cambios'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <nav className="iv__crumb mb-3">
          <Link href="/clasificados/mis">Mis clasificados</Link>
          <span>/</span>
          <span>Mi comercio</span>
        </nav>
        <h1 className="font-display text-3xl font-bold text-ink" style={{ letterSpacing: '-0.03em' }}>
          {dealership.name}
        </h1>
        {dealership.status === 'approved' && (
          <Link
            href={`/comercios/${dealership.slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-accent mt-2"
          >
            Ver mi vidriera
            <ExternalLink size={13} aria-hidden="true" />
          </Link>
        )}
      </div>

      {dealership.status !== 'approved' && (
        <div className="p-4 rounded-[var(--radius-md)] bg-sunken text-sm text-body">
          {dealership.status === 'pending' &&
            'Tu solicitud está en revisión. Podés dejar tus datos listos mientras tanto.'}
          {dealership.status === 'rejected' &&
            `Tu solicitud fue rechazada${dealership.rejectionReason ? `: ${dealership.rejectionReason}` : '.'}`}
          {dealership.status === 'suspended' && 'Tu cuenta está suspendida.'}
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
          />
          {/* The slug is not editable: it is the storefront's public address,
              and renaming it would break every link already out there. */}
          <p className="text-xs text-muted">
            Dirección de tu vidriera: <span className="font-mono">/comercios/{dealership.slug}</span>
          </p>

          <Textarea
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={4}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Departamento"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Elegí el departamento"
              options={[...UY_DEPARTMENTS]}
            />
            <Input label="Ciudad o barrio" type="text" value={city} onChange={(e) => setCity(e.target.value)} maxLength={100} />
            <Input label="Dirección" type="text" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} />
          </div>

          <div>
            <p className="tm-field__label mb-2">Ubicación en el mapa</p>
            <MapPicker value={pin} onChange={setPin} subject="tu comercio" focus={UY_DEPARTMENT_CENTERS[department] ?? null} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Teléfono" type="text" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} />
            <Input label="WhatsApp" type="text" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} maxLength={40} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Sitio web" type="text" value={website} onChange={(e) => setWebsite(e.target.value)} maxLength={200} />
            <Input label="Horarios" type="text" value={hours} onChange={(e) => setHours(e.target.value)} maxLength={200} />
          </div>
        </div>

        <div className="bg-surface border border-line rounded-[var(--radius-lg)] p-6 space-y-5">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">Tu página</h2>
            <p className="text-xs text-muted mt-1">
              Lo que ve quien entra a tu vidriera, arriba de tus avisos: tu logo, una imagen de portada y
              lo que quieras contar, con fotos y videos.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-5">
            <ImageUploadField
              label="Logo"
              shape="square"
              value={logoUrl}
              onChange={setLogoUrl}
              upload={uploadMyDealershipImage}
            />
            <ImageUploadField
              label="Portada"
              value={coverImage}
              onChange={setCoverImage}
              upload={uploadMyDealershipImage}
              hint="Una foto ancha: tu local, tu flota, tu equipo. Se ve en 3:1."
            />
          </div>

          <div className="space-y-2">
            <p className="tm-field__label">Contenido</p>
            <RichEditor
              value={pageMarkdown}
              onChange={setPageMarkdown}
              uploadImage={uploadMyDealershipImage}
              placeholder="Contá quiénes son, qué ofrecen, cómo trabajan… Podés agregar títulos, fotos y videos."
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-4 rounded-[var(--radius-md)] bg-danger-soft text-danger-ink text-sm">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
            {error}
          </div>
        )}
        {saved && (
          <div className="flex items-start gap-2 p-4 rounded-[var(--radius-md)] bg-sunken text-sm text-body">
            <CheckCircle size={16} className="flex-shrink-0 mt-0.5 text-accent" aria-hidden="true" />
            Guardamos los cambios.
          </div>
        )}

        <Button type="submit" loading={saving}>
          Guardá los cambios
        </Button>
      </form>
    </div>
  )
}

export default function DealershipPanelPage() {
  return (
    <RequireAuth>
      <PanelInner />
    </RequireAuth>
  )
}
