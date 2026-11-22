import { SITE_CONFIG } from './tenant'

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || SITE_CONFIG.defaultUrl

export const SITE_NAME = SITE_CONFIG.name

export const SITE_LOGO = `${SITE_URL}/brand/${SITE_CONFIG.brand}-mark.svg`

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString()
}
