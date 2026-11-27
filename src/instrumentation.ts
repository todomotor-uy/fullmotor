import type { Instrumentation } from 'next'

/**
 * Server-render errors, reported to the API (POST /api/client-errors). Next
 * calls this for failures in server components, route handlers and server
 * actions; the digest is the same one the browser's error boundary sees.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const err = error as Error & { digest?: string }
  // 404s and redirects travel as thrown errors too; they are not failures.
  if (err.digest?.startsWith('NEXT_') || err.message === 'NEXT_NOT_FOUND') return
  const { reportError } = await import('@/lib/feedback-api')
  const page = request.path.split('?')[0]
  await reportError({
    source: 'web-server',
    message: `${err.name || 'Error'}: ${err.message}`,
    detail: [`${context.routerKind} ${context.routeType} ${context.routePath}`, err.stack].filter(Boolean).join('\n'),
    digest: err.digest,
    page,
  })
}
