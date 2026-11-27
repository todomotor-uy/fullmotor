'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AlertCircle, Check } from 'lucide-react'
import { useAuth } from './AuthProvider'
import { Button } from './ui/Button'
import { Input, Textarea } from './ui/Input'
import { sendFeedback } from '@/lib/feedback-api'
import { translateApiError } from '@/lib/api-error'

const MAX = 2000

/**
 * "Enviar comentario": a link in the footer that opens a small form. What is
 * sent is stored by the API with the site, the page and — when the
 * visitor is signed in — their account. Anyone else may leave an address.
 */
export default function FeedbackButton({ className }: { className?: string }) {
  const { user } = useAuth()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const close = () => {
    setOpen(false)
    if (sent) {
      setSent(false)
      setMessage('')
      setContact('')
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true)
    setError(null)
    try {
      await sendFeedback({ message: message.trim(), page: pathname, contact: user ? undefined : contact.trim() || undefined })
      setSent(true)
    } catch (err) {
      setError(translateApiError(err, 'No pudimos enviar tu comentario. Probá de nuevo.'))
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        Enviar comentario
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-[rgba(8,21,46,0.45)] backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) close()
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
            className="bg-surface border border-line rounded-[var(--radius-xl)] p-6 mx-4 max-w-md w-full shadow-pop text-left"
          >
            <h3 id="feedback-title" className="font-display text-lg font-bold text-ink mb-1">
              Enviar comentario
            </h3>
            {sent ? (
              <div className="space-y-4">
                <p className="flex items-start gap-2 text-sm text-positive-ink">
                  <Check size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                  ¡Gracias! Lo recibimos y lo vamos a leer.
                </p>
                <Button type="button" variant="secondary" block onClick={close}>
                  Cerrar
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <p className="text-sm text-muted">
                  ¿Algo no funciona, falta algo o tenés una idea? Contanos.
                </p>
                <Textarea
                  label="Comentario"
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, MAX))}
                  rows={5}
                  required
                  autoFocus
                  hint={`${message.length}/${MAX}`}
                />
                {!user && (
                  <Input
                    label="Email o teléfono (opcional)"
                    value={contact}
                    onChange={(e) => setContact(e.target.value.slice(0, 200))}
                    hint="Solo si querés que te respondamos."
                  />
                )}
                {error && (
                  <p className="flex items-start gap-2 text-sm text-danger-ink">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                    {error}
                  </p>
                )}
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="ghost" onClick={close}>
                    Cancelar
                  </Button>
                  <Button type="submit" loading={sending} disabled={!message.trim()}>
                    Enviar
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
