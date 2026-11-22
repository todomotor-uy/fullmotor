'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { AlertCircle, ImagePlus, Star, X } from 'lucide-react'
import {
  CLASSIFIED_CATEGORIES,
  Classified,
  ClassifiedCategory,
  ClassifiedFacets,
  ALLOWED_IMAGE_TYPES,
  MAX_CLASSIFIED_IMAGES,
  MAX_IMAGE_SIZE_BYTES,
  categoryHasVehicleFields,
  fuelTypeLabels,
  transmissionLabels,
} from '@/types/classified'
import {
  CreateClassifiedPayload,
  UpdateClassifiedPayload,
  VehicleFieldsPayload,
  createClassified,
  updateClassified,
  uploadClassifiedImages,
} from '@/lib/classifieds-api'
import { useAuth } from './AuthProvider'
import { Button } from './ui/Button'
import { Input, Textarea } from './ui/Input'
import { Select } from './ui/Select'
import ClassifiedImageUploader from './ClassifiedImageUploader'
import { translateApiError } from '@/lib/api-error'

import { IS_NAUTI } from '@/lib/tenant'

const COUNTRY = process.env.NEXT_PUBLIC_COUNTRY || 'uy'

interface ClassifiedFormProps {
  mode: 'create' | 'edit'
  initial?: Classified
  facets: ClassifiedFacets
}

export default function ClassifiedForm({ mode, initial, facets }: ClassifiedFormProps) {
  const router = useRouter()
  const { user } = useAuth()

  const [title, setTitle] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [category, setCategory] = useState<ClassifiedCategory>(
    initial?.category || CLASSIFIED_CATEGORIES[0].id
  )
  const [price, setPrice] = useState<string>(initial?.price ? String(initial.price) : '')
  const [currency, setCurrency] = useState(initial?.currency || 'USD')
  const [city, setCity] = useState(initial?.city || '')
  const [contactInfo, setContactInfo] = useState(initial?.contactInfo || '')
  const [showContactInfo, setShowContactInfo] = useState(initial?.showContactInfo ?? true)
  const [year, setYear] = useState(initial?.year ? String(initial.year) : '')
  const [mileageKm, setMileageKm] = useState(
    initial?.mileageKm !== undefined ? String(initial.mileageKm) : ''
  )
  const [brand, setBrand] = useState(initial?.brand || '')
  const [model, setModel] = useState(initial?.model || '')
  const [fuelType, setFuelType] = useState(initial?.fuelType || '')
  const [transmission, setTransmission] = useState(initial?.transmission || '')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([])
  // Mirrors pendingPreviews so the unmount cleanup can revoke whatever is
  // current without re-registering the effect on every change.
  const pendingPreviewsRef = useRef<string[]>([])
  pendingPreviewsRef.current = pendingPreviews
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const isCreate = mode === 'create'

  // The API decides the cap — it is higher for an approved business. Read it
  // off the listing when editing, off the session when publishing, and only
  // fall back to the private-seller constant when neither has loaded yet.
  const maxImages = initial?.maxImages ?? user?.limits?.maxImages ?? MAX_CLASSIFIED_IMAGES

  const validateFiles = (files: File[]): string | null => {
    if (files.length > maxImages) {
      return `Máximo ${maxImages} imágenes.`
    }
    for (const f of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(f.type)) {
        return `Tipo no permitido: ${f.name}`
      }
      if (f.size > MAX_IMAGE_SIZE_BYTES) {
        return `Archivo muy grande: ${f.name} (${(f.size / 1024 / 1024).toFixed(1)} MB)`
      }
    }
    return null
  }

  const handleCreateImages = (fileList: FileList | null) => {
    if (!fileList) return
    const files = Array.from(fileList)
    const v = validateFiles(files)
    if (v) {
      setError(v)
      return
    }
    setError(null)
    setPendingPreviews((old) => {
      old.forEach(URL.revokeObjectURL)
      return files.map((f) => URL.createObjectURL(f))
    })
    setPendingFiles(files)
  }

  /** Reorders both arrays together; index 0 is the cover. */
  const reorderPending = (from: number, to: number) => {
    const move = <T,>(arr: T[]) => {
      const next = [...arr]
      next.splice(to, 0, ...next.splice(from, 1))
      return next
    }
    setPendingFiles(move)
    setPendingPreviews(move)
  }

  const removePending = (index: number) => {
    setPendingPreviews((old) => {
      URL.revokeObjectURL(old[index])
      return old.filter((_, i) => i !== index)
    })
    setPendingFiles((old) => old.filter((_, i) => i !== index))
  }

  // Object URLs stay allocated until revoked, so drop any survivors on unmount.
  useEffect(() => {
    return () => {
      pendingPreviewsRef.current.forEach(URL.revokeObjectURL)
    }
  }, [])

  const showsVehicleFields = categoryHasVehicleFields(category)

  /**
   * Builds the vehicle half of the payload.
   *
   * Returns nothing at all for a non-vehicle category, even though the inputs
   * keep their values in React state — that is deliberate, so switching from
   * Autos to Repuestos and back restores what was typed. Sending them anyway
   * would earn a 400 the seller cannot act on, since the field the API names is
   * one the form no longer shows.
   */
  const buildVehicleFields = (): VehicleFieldsPayload => {
    if (!showsVehicleFields) return {}

    const fields: VehicleFieldsPayload = {}
    if (year.trim()) fields.year = Number(year)
    // Not `if (mileageKm)` — 0 km is a real value meaning new.
    if (mileageKm.trim()) fields.mileageKm = Number(mileageKm)
    if (brand) fields.brand = brand
    if (model.trim()) fields.model = model.trim()
    if (fuelType) fields.fuelType = fuelType
    if (transmission) fields.transmission = transmission
    return fields
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedTitle = title.trim()
    const trimmedDesc = description.trim()
    const trimmedCity = city.trim()
    const priceNum = Number(price)

    if (!trimmedTitle || !trimmedDesc || !trimmedCity) {
      setError('Completá título, descripción y ciudad.')
      return
    }
    if (trimmedTitle.length > 120) {
      setError('El título debe tener máximo 120 caracteres.')
      return
    }
    if (trimmedDesc.length > 2000) {
      setError('La descripción debe tener máximo 2000 caracteres.')
      return
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setError('El precio debe ser un número mayor a 0.')
      return
    }
    if (currency.length !== 3) {
      setError('La moneda debe ser un código de 3 letras (ej. USD, UYU).')
      return
    }
    // Required on create only. In edit mode a listing published before these
    // fields existed has to stay savable without being forced to fill them.
    if (showsVehicleFields && isCreate && (!year.trim() || !brand || !model.trim())) {
      setError('Completá año, marca y modelo del vehículo.')
      return
    }
    if (year.trim()) {
      const y = Number(year)
      const maxYear = new Date().getFullYear() + 1
      if (!Number.isInteger(y) || y < 1900 || y > maxYear) {
        setError(`El año debe estar entre 1900 y ${maxYear}.`)
        return
      }
    }
    if (mileageKm.trim()) {
      const km = Number(mileageKm)
      if (!Number.isInteger(km) || km < 0 || km > 1000000) {
        setError('El kilometraje debe estar entre 0 y 1.000.000.')
        return
      }
    }
    if (contactInfo.trim().length > 200) {
      setError('El contacto debe tener máximo 200 caracteres.')
      return
    }

    setSubmitting(true)
    try {
      if (isCreate) {
        const payload: CreateClassifiedPayload = {
          title: trimmedTitle,
          description: trimmedDesc,
          category,
          price: priceNum,
          currency: currency.toUpperCase(),
          countryCode: COUNTRY,
          city: trimmedCity,
          showContactInfo,
          ...buildVehicleFields(),
        }
        if (contactInfo.trim()) payload.contactInfo = contactInfo.trim()

        setProgress('Creando publicación…')
        const created = await createClassified(payload)

        if (pendingFiles.length > 0) {
          const n = pendingFiles.length
          setProgress(n === 1 ? 'Subiendo la foto…' : `Subiendo ${n} fotos…`)
          try {
            // One request for the whole set. This used to be a loop of one
            // request per photo, which was slow and could leave a listing
            // half-published if a later file failed.
            const result = await uploadClassifiedImages(created.id, pendingFiles)
            if (result.errors.length > 0) {
              setError(
                `Publicamos tu aviso, pero ${result.errors.length} de ${n} fotos no se pudieron subir. Reintentá desde acá.`
              )
              router.push(`/clasificados/${created.id}/editar`)
              return
            }
          } catch (err) {
            const m = translateApiError(err, 'no pudimos subir las fotos')
            setError(`Publicamos tu aviso, pero ${m}. Reintentá desde acá.`)
            router.push(`/clasificados/${created.id}/editar`)
            return
          }
        }
        setProgress('Abriendo tu publicación…')
        router.push(`/clasificados/${created.id}`)
      } else {
        if (!initial) throw new Error('Falta clasificado original')
        const payload: UpdateClassifiedPayload = {
          title: trimmedTitle,
          description: trimmedDesc,
          category,
          price: priceNum,
          currency: currency.toUpperCase(),
          city: trimmedCity,
          showContactInfo,
          ...buildVehicleFields(),
        }
        // Only send the contact when it actually changed. Sending it
        // unconditionally meant that any listing whose contactInfo failed to
        // load prefilled blank and then overwrote the seller's real number with
        // an empty string on the next save of any unrelated field.
        if (contactInfo.trim() !== (initial.contactInfo ?? '')) {
          payload.contactInfo = contactInfo.trim()
        }
        setProgress('Guardando cambios…')
        await updateClassified(initial.id, payload)
        router.push(`/clasificados/${initial.id}`)
      }
      // Deliberately no `finally`: on success the button stays disabled until
      // the route change lands. It used to be re-enabled here, which left a
      // measured 1.8s window — 6.0s to re-enable, 7.8s to navigate — where a
      // second click would publish the whole listing again.
    } catch (err) {
      setError(translateApiError(err, 'Error al guardar'))
      setSubmitting(false)
      setProgress(null)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-surface border border-line rounded-[var(--radius-lg)] p-6 space-y-4">
        <h2 className="font-display text-lg font-bold text-ink">Datos del aviso</h2>

        <Input
          label="Título"
          required
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder={IS_NAUTI ? 'Ej. Lancha 19 pies con motor fuera de borda' : 'Ej. Honda Civic 2020 impecable'}
          hint={`${title.length}/120`}
          className="[&_.tm-field__hint]:font-mono"
        />

        <Textarea
          label="Descripción"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={5}
          placeholder="Detalles del vehículo, kilometraje, estado, etc."
          hint={`${description.length}/2000`}
          className="[&_.tm-field__hint]:font-mono"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Categoría"
            value={category}
            onChange={(e) => setCategory(e.target.value as ClassifiedCategory)}
            options={CLASSIFIED_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
          />
          <Input
            label="Ciudad"
            required
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={100}
            placeholder="Ej. Montevideo"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Precio"
              required
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="15000"
              className="[&_.tm-input]:font-mono"
            />
          </div>
          <Select
            label="Moneda"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            options={['USD', 'UYU', 'ARS', 'CLP']}
          />
        </div>

        <div className="space-y-2">
          <Input
            label="Contacto (teléfono, WhatsApp, email)"
            type="text"
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
            maxLength={200}
            placeholder="+598 99 123 456"
          />
          <label className="flex items-center gap-2 text-sm text-body cursor-pointer">
            <input
              type="checkbox"
              checked={showContactInfo}
              onChange={(e) => setShowContactInfo(e.target.checked)}
              className="w-4 h-4 accent-[var(--accent)]"
            />
            Mostrá tu contacto en la publicación
          </label>
        </div>
      </div>

      {/* Only for the categories these describe. A set of tyres has no
          odometer reading, and the API rejects the fields outright. */}
      {showsVehicleFields && (
        <div className="bg-surface border border-line rounded-[var(--radius-lg)] p-6 space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">Datos del vehículo</h2>
            <p className="text-xs text-muted mt-1">
              Con estos datos tu aviso aparece en las búsquedas por marca, año y kilometraje.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Marca"
              required={isCreate}
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Elegí una marca"
              options={facets.brands}
            />
            <Input
              label="Modelo"
              required={isCreate}
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              maxLength={60}
              placeholder="Ej. Corolla XEI"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Año"
              required={isCreate}
              type="number"
              min="1900"
              max={new Date().getFullYear() + 1}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2019"
              className="[&_.tm-input]:font-mono"
            />
            <Input
              label="Kilometraje"
              type="number"
              min="0"
              value={mileageKm}
              onChange={(e) => setMileageKm(e.target.value)}
              placeholder="0 si es 0 km"
              hint="Dejalo vacío si preferís no decirlo"
              className="[&_.tm-input]:font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Combustible"
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value)}
              placeholder="Sin especificar"
              options={facets.fuelTypes.map((v) => ({ value: v, label: fuelTypeLabels[v] || v }))}
            />
            <Select
              label="Transmisión"
              value={transmission}
              onChange={(e) => setTransmission(e.target.value)}
              placeholder="Sin especificar"
              options={facets.transmissions.map((v) => ({
                value: v,
                label: transmissionLabels[v] || v,
              }))}
            />
          </div>
        </div>
      )}

      <div className="bg-surface border border-line rounded-[var(--radius-lg)] p-6 space-y-3">
        <h2 className="font-display text-lg font-bold text-ink">Fotos</h2>
        {isCreate ? (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-8 px-4 border border-dashed border-line-strong rounded-[var(--radius-lg)] text-muted hover:border-accent hover:text-accent transition-colors cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              <ImagePlus size={24} aria-hidden="true" />
              <span className="text-sm">
                {pendingPreviews.length > 0
                  ? `${pendingPreviews.length} de ${maxImages} fotos — tocá para elegir otras`
                  : `Subí hasta ${maxImages} fotos (JPG, PNG o WebP)`}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_IMAGE_TYPES.join(',')}
              multiple
              onChange={(e) => handleCreateImages(e.target.files)}
              className="hidden"
            />
            <p className="text-xs text-muted">
              Las fotos se suben al crear la publicación. La primera es la portada.
            </p>
            {pendingPreviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {pendingPreviews.map((src, i) => (
                  <div
                    key={src}
                    className="relative aspect-square rounded-[var(--radius-md)] overflow-hidden border border-line bg-sunken group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="w-full h-full object-cover" />

                    {i === 0 ? (
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-accent text-white text-[10px] font-semibold">
                        Portada
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => reorderPending(i, 0)}
                        aria-label={`Usar la foto ${i + 1} como portada`}
                        title="Usar como portada"
                        className="absolute bottom-1 left-1 w-6 h-6 rounded-full bg-[rgba(8,21,46,0.6)] text-white flex items-center justify-center cursor-pointer hover:bg-accent transition-colors"
                      >
                        <Star size={12} aria-hidden="true" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => removePending(i)}
                      aria-label={`Quitar la foto ${i + 1}`}
                      title="Quitar"
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-[rgba(8,21,46,0.6)] text-white flex items-center justify-center cursor-pointer hover:bg-danger transition-colors"
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          initial && (
            <ClassifiedImageUploader
              classifiedId={initial.id}
              initialImages={initial.images}
              maxImages={maxImages}
            />
          )
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-4 rounded-[var(--radius-md)] bg-danger-soft text-danger-ink text-sm">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" loading={submitting}>
          {submitting ? progress || 'Guardando…' : isCreate ? 'Publicá tu aviso' : 'Guardá los cambios'}
        </Button>
        <Button variant="ghost" onClick={() => router.back()} disabled={submitting}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
