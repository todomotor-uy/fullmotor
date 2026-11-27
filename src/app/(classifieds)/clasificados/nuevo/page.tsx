import { fetchClassifiedFacets } from '@/lib/classifieds-api'
import NewClassifiedClient from './NewClassifiedClient'

/**
 * A server component purely so the brand and fuel lists are in the HTML.
 * Fetching them from the client would leave the brand select briefly empty,
 * and it is a required field.
 */
export default async function NewClassifiedPage() {
  const facets = await fetchClassifiedFacets()
  return <NewClassifiedClient facets={facets} />
}
