import { requireModule } from '@/lib/site-settings.server'

// 404 on a site that does not run the catalog module (see /admin/sitio).
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireModule('catalog')
  return children
}
