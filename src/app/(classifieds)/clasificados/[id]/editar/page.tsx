import { fetchClassifiedFacets } from '@/lib/classifieds-api'
import EditClassifiedClient from './EditClassifiedClient'

/**
 * A server component purely so the brand and fuel lists are in the HTML.
 * Fetching them from the client would leave the brand select briefly empty,
 * and it is a required field.
 */
export default async function EditClassifiedPage() {
  const facets = await fetchClassifiedFacets()
  return <EditClassifiedClient facets={facets} />
}
