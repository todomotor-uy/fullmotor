import { requireModule } from '@/lib/site-settings.server'

/**
 * Every page of the classifieds module lives in this route group. The parentheses keep
 * "(classifieds)" out of the URL; this layout 404s all of them at once on a site that
 * has the module switched off (see /admin/sitio).
 */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireModule('classifieds')
  return children
}
