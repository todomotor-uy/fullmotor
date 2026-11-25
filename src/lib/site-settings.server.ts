import { cache } from 'react'
import { notFound } from 'next/navigation'
import { tenantHeader } from '@/lib/tenant'
import { FALLBACK_SETTINGS, hasModule, settingsFromTenant, type ModuleName, type SiteSettings } from '@/lib/site-settings'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

/**
 * The site's settings from the API.
 *
 * Read by the root layout, so this cache sets the revalidation of every page:
 * an hour, not less, or static pages like /privacidad would regenerate on
 * every visit. Saving in /admin/sitio expires the "site-settings" tag
 * (refreshPublicContent), so a change still shows at once.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const res = await fetch(`${API_URL}/api/meta/tenant`, {
      headers: tenantHeader(),
      next: { revalidate: 3600, tags: ['site-settings'] },
    })
    if (!res.ok) return FALLBACK_SETTINGS
    const body = (await res.json()) as { data?: unknown }
    return settingsFromTenant(body.data)
  } catch {
    return FALLBACK_SETTINGS
  }
})

/** 404s the page when the site has the module switched off. */
export async function requireModule(module: ModuleName): Promise<SiteSettings> {
  const settings = await getSiteSettings()
  if (!hasModule(settings, module)) notFound()
  return settings
}
