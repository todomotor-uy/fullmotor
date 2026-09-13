/**
 * Client-side image preparation for uploads that go through the API.
 *
 * The API runs on Vercel, where a function accepts at most 4.5 MB per request —
 * a hard platform limit, not one of ours, and it answers 413 with an HTML body
 * that never reaches the translation layer. A phone photo is routinely 3–8 MB,
 * so without this a large fraction of classified uploads would fail outright.
 *
 * Every photo ends up on a ~1000px card at most, so recompressing to a bounded
 * edge and JPEG quality loses nothing anyone sees and also makes the upload
 * itself several times faster on mobile.
 */

/** Longest edge after resizing. Well above any card or lightbox on the site. */
const MAX_EDGE_PX = 2000

/**
 * Size a prepared file must stay under. Below the platform's 4.5 MB with room
 * for multipart framing, and small enough that two fit in one request.
 */
export const MAX_UPLOAD_FILE_BYTES = 2 * 1024 * 1024

/** Files at or under this are sent as they are: nothing to gain. */
const PASSTHROUGH_BYTES = 1024 * 1024

const JPEG_QUALITIES = [0.85, 0.75, 0.65, 0.55]

/**
 * Returns a file safe to send through the API, or the original when it
 * already is (or cannot be re-encoded: animated GIFs, non-browser contexts,
 * decoding failures). The caller still checks the size afterwards — a photo
 * that will not fit even at the lowest quality is reported, not sent.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return file
  if (file.size <= PASSTHROUGH_BYTES) return file
  // Re-encoding a GIF drops the animation; leave it alone.
  if (file.type === 'image/gif') return file

  try {
    const bitmap = await decode(file)
    try {
      const { width, height } = fit(bitmap.width, bitmap.height, MAX_EDGE_PX)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return file
      // A white ground so PNGs with transparency do not turn black in JPEG.
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(bitmap, 0, 0, width, height)

      let best: Blob | null = null
      for (const quality of JPEG_QUALITIES) {
        const blob = await toBlob(canvas, 'image/jpeg', quality)
        if (!blob) break
        best = blob
        if (blob.size <= MAX_UPLOAD_FILE_BYTES) break
      }
      if (!best) return file
      // A file that was already a lean JPEG can come out larger; keep the
      // original when it also fits.
      if (best.size >= file.size && file.size <= MAX_UPLOAD_FILE_BYTES) return file

      return new File([best], jpegName(file.name), {
        type: 'image/jpeg',
        lastModified: file.lastModified,
      })
    } finally {
      if ('close' in bitmap) bitmap.close()
    }
  } catch {
    return file
  }
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    // 'from-image' applies the EXIF rotation, so a portrait phone photo does
    // not come out sideways once the metadata is gone.
    return createImageBitmap(file, { imageOrientation: 'from-image' })
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('decode failed'))
    }
    img.src = url
  })
}

function fit(width: number, height: number, maxEdge: number) {
  const longest = Math.max(width, height)
  if (longest <= maxEdge) return { width, height }
  const scale = maxEdge / longest
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

function jpegName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '') || 'foto'
  return `${base}.jpg`
}

/**
 * Groups files into requests that each stay under `maxBytes` and `maxCount`.
 * Greedy and order-preserving, so the listing's photo order is the user's.
 * Files larger than `maxBytes` on their own are the caller's problem to
 * filter first; here they would each get a request of their own.
 */
export function planUploadBatches<T extends { size: number }>(
  files: T[],
  maxBytes: number,
  maxCount: number
): T[][] {
  const batches: T[][] = []
  let current: T[] = []
  let currentBytes = 0
  for (const file of files) {
    const overflows = current.length >= maxCount || currentBytes + file.size > maxBytes
    if (overflows && current.length > 0) {
      batches.push(current)
      current = []
      currentBytes = 0
    }
    current.push(file)
    currentBytes += file.size
  }
  if (current.length > 0) batches.push(current)
  return batches
}
