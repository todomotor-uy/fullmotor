'use client'

import { createContext, useContext } from 'react'
import {
  FALLBACK_SETTINGS,
  hasModule,
  siteNav,
  categoryLabel,
  type ModuleName,
  type SiteSettings,
} from '@/lib/site-settings'

const SiteSettingsContext = createContext<SiteSettings>(FALLBACK_SETTINGS)

/** Hands the settings the root layout fetched to every client component. */
export default function SiteSettingsProvider({
  settings,
  children,
}: {
  settings: SiteSettings
  children: React.ReactNode
}) {
  return <SiteSettingsContext.Provider value={settings}>{children}</SiteSettingsContext.Provider>
}

export function useSiteSettings(): SiteSettings {
  return useContext(SiteSettingsContext)
}

export function useModule(module: ModuleName): boolean {
  return hasModule(useSiteSettings(), module)
}

export function useSiteNav() {
  return siteNav(useSiteSettings())
}

export function useCategories() {
  return useSiteSettings().categories
}

export function useCategoryLabel() {
  const settings = useSiteSettings()
  return (key: string) => categoryLabel(settings, key)
}

/** Renders its children only on a site that runs the module. */
export function ModuleGate({ module, children }: { module: ModuleName; children: React.ReactNode }) {
  return useModule(module) ? <>{children}</> : null
}
