/**
 * Scheduled publishing in the panel: posts and events saved as drafts with a
 * time go live on their own (the API checks every minute).
 *
 * Times are entered and shown in the editor's own time zone — the browser's
 * — and travel as ISO instants, so nobody has to think about offsets.
 */

/** ISO instant → value for <input type="datetime-local">. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** <input type="datetime-local"> value → ISO instant ("" stays ""). */
export function fromLocalInput(value: string): string {
  if (!value) return ''
  const d = new Date(value)
  return isNaN(d.getTime()) ? '' : d.toISOString()
}

/** "lun 24 nov, 09:00" */
export function formatSchedule(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('es-UY', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** The earliest a datetime-local picker should offer: the next minute. */
export function minScheduleInput(): string {
  return toLocalInput(new Date(Date.now() + 60_000).toISOString())
}

/** Why a picked time cannot be used, or null when it can. */
export function scheduleProblem(value: string): string | null {
  if (!value) return 'Elegí fecha y hora.'
  const d = new Date(value)
  if (isNaN(d.getTime())) return 'Esa fecha no es válida.'
  if (d.getTime() < Date.now() - 60_000) return 'Esa hora ya pasó.'
  return null
}
