// Catch-all proxy to the Basin AI (FSM Assistant) container.
//
// Why this exists: the FSM Assistant API is hosted on a separate Azure
// Container App that does not currently allow `http://localhost:3000` (or
// our deployed origin) via CORS. Calling it directly from the browser
// triggers a preflight failure ("Failed to fetch", `<no response>`).
// Routing through this same-origin Nitro proxy makes the request a normal
// server-to-server fetch — no preflight, no CORS, and we get to control
// which headers are forwarded.
//
// The frontend points `runtimeConfig.public.basinAiApiBase` at `/api/basin-ai`
// and uses normal paths (`/chat`, `/threads`, etc.). This handler appends
// the wildcard suffix and the original query string to the upstream base.

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const upstreamBase = (config.basinAiUpstreamUrl as string) || ''
  if (!upstreamBase) {
    throw createError({
      statusCode: 500,
      statusMessage: 'basinAiUpstreamUrl is not configured',
    })
  }

  const subPath = (getRouterParam(event, 'path') || '').replace(/^\/+/, '')
  const query = getRequestURL(event).search
  const upstreamUrl = `${upstreamBase.replace(/\/+$/, '')}/${subPath}${query || ''}`

  const method = getMethod(event)
  const reqHeaders = getRequestHeaders(event)

  // Forward only safe headers — strip hop-by-hop and host-related entries
  // that would confuse the upstream server.
  const fwdHeaders: Record<string, string> = {}
  const drop = new Set([
    'host',
    'connection',
    'content-length',
    'transfer-encoding',
    'keep-alive',
    'upgrade',
    'expect',
    'accept-encoding',
  ])
  for (const [k, v] of Object.entries(reqHeaders)) {
    if (!v) continue
    if (drop.has(k.toLowerCase())) continue
    fwdHeaders[k] = Array.isArray(v) ? v.join(', ') : String(v)
  }

  const init: RequestInit = { method, headers: fwdHeaders }
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = await readRawBody(event)
  }

  let upstream: Response
  try {
    upstream = await fetch(upstreamUrl, init)
  } catch (err: any) {
    console.error('[basin-ai-proxy] upstream fetch failed', {
      upstreamUrl,
      err: err?.message,
    })
    throw createError({
      statusCode: 502,
      statusMessage: `Basin AI upstream unreachable: ${err?.message || 'unknown error'}`,
    })
  }

  setResponseStatus(event, upstream.status)
  const contentType = upstream.headers.get('content-type') || ''
  const cacheControl = upstream.headers.get('cache-control')
  if (cacheControl) setHeader(event, 'Cache-Control', cacheControl)

  // Parse JSON responses into an object so `$fetch` on the client receives a
  // structured payload (otherwise it falls back to a string and our chat
  // extractor dumps the whole envelope into the message bubble). Non-JSON
  // bodies (e.g. health text, future SSE) pass through as-is.
  if (contentType.includes('application/json')) {
    setHeader(event, 'Content-Type', 'application/json')
    const text = await upstream.text()
    if (!text) return null
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }

  if (contentType) setHeader(event, 'Content-Type', contentType)
  return new Uint8Array(await upstream.arrayBuffer())
})
