'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { translateApiError } from '@/lib/api-error'

interface ImageUploadFieldProps {
  label: string
  value: string
  onChange: (url: string) => void
  /** Uploads the file and returns its URL. */
  upload: (file: File) => Promise<string>
  /** "banner" is a wide strip, "square" a logo. */
  shape?: 'banner' | 'square'
  hint?: string
}

/** One image, uploaded on pick, with a preview and a way to remove it. */
export default function ImageUploadField({ label, value, onChange, upload, shape = 'banner', hint }: ImageUploadFieldProps) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pick = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      onChange(await upload(file))
    } catch (err) {
      setError(translateApiError(err, 'No pudimos subir la imagen'))
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <p className="tm-field__label">{label}</p>
      <div className={`img-field img-field--${shape}`}>
        {value ? (
          <>
            <Image src={value} alt="" fill sizes={shape === 'banner' ? '(max-width: 800px) 100vw, 760px' : '120px'} style={{ objectFit: 'cover' }} />
            <button type="button" className="img-field__remove" onClick={() => onChange('')} aria-label={`Quitar ${label.toLowerCase()}`}>
              <X size={14} aria-hidden="true" />
            </button>
          </>
        ) : (
          <button type="button" className="img-field__empty" onClick={() => input.current?.click()} disabled={busy}>
            <ImagePlus size={20} aria-hidden="true" />
            <span>{busy ? 'Subiendo…' : 'Subir imagen'}</span>
          </button>
        )}
      </div>
      {value && (
        <button type="button" className="text-sm text-accent underline" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? 'Subiendo…' : 'Cambiar imagen'}
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {hint && <p className="text-xs text-muted">{hint}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
