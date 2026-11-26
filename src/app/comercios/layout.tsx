import { requireModule } from '@/lib/site-settings.server'

// 404 on a site that does not run the storefronts module (see /admin/sitio).
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireModule('storefronts')
  return children
}
