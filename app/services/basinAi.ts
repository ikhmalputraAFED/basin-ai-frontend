/**
 * Basin AI (FSM Assistant) front-end service.
 *
 * Wraps the FSM Assistant HTTP API. The backend will eventually live in its own
 * container; until then this client points at `runtimeConfig.public.basinAiApiBase`
 * so swapping the host is a single env-var change.
 *
 * OpenAPI: /openapi.json on the FSM Assistant container. The shapes below mirror
 * that contract verbatim — keep them in sync if the API evolves.
 */

export interface ChatRequest {
  message: string
  thread_id: string
  username?: string | null
  user_id?: string | null
  prompt_id?: string | null
  session_id?: string | null
  /** Default `true` server-side; set `false` for non-streaming JSON. */
  stream?: boolean
  /** `null` defers to the server default. */
  web_search?: boolean | null
}

export interface ThreadMetadata {
  thread_id: string
  user_id?: string | null
  session_id?: string | null
  title: string
  created_at: string
  updated_at: string
  message_count: number
  last_prompt_id?: string | null
}

export interface ThreadDetail {
  metadata: ThreadMetadata
  /** Flattened LangGraph messages — at minimum `role` + `content`. */
  messages: Array<Record<string, unknown>>
}

export interface ThreadListResponse {
  threads: ThreadMetadata[]
  next_cursor?: string | null
}

export interface ThreadPatchRequest {
  title: string
}

interface ListThreadsParams {
  user_id?: string
  session_id?: string
  limit?: number
  cursor?: string
}

/** FSM `/chat` accepts `username` only when it satisfies JSON Schema `format: email`. */
function emailOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const s = value.trim()
  if (!s) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : null
}

/**
 * Returns a typed Basin AI client bound to the runtime base URL and the
 * current user's identity headers (we propagate the same Keycloak user as
 * the rest of the app so backend access controls stay consistent).
 */
export function useBasinAiService() {
  const config = useRuntimeConfig()
  const baseURL = config.public.basinAiApiBase as string

  const { user } = useAuth()

  /** Build identity headers + body fields from the current Keycloak user. */
  function identity() {
    const u: any = user.value || {}
    const userId: string | undefined =
      u.id ?? u.user_id ?? u.keycloak_id ?? (typeof u.email === 'string' ? u.email : undefined)
    const username = emailOrNull(u.email)
    return { userId, username }
  }

  const api = $fetch.create({
    baseURL,
    onRequest({ options }) {
      const { userId } = identity()
      const headers = new Headers(options.headers as HeadersInit | undefined)
      if (userId) headers.set('X-User-Id', userId)
      options.headers = headers
    },
  })

  /** POST /chat — non-streaming JSON envelope (we set `stream: false`). */
  async function chat(req: Omit<ChatRequest, 'stream'>) {
    const { username, userId } = identity()
    const resolvedUsername = emailOrNull(req.username) ?? username
    const body: ChatRequest = {
      ...req,
      stream: false,
      username: resolvedUsername,
      user_id: req.user_id ?? userId ?? null,
    }
    return api<unknown>('/chat', { method: 'POST', body })
  }

  function listThreads(params: ListThreadsParams = {}) {
    return api<ThreadListResponse>('/threads', { method: 'GET', query: params })
  }

  function getThread(threadId: string) {
    return api<ThreadDetail>(`/threads/${encodeURIComponent(threadId)}`)
  }

  function patchThread(threadId: string, body: ThreadPatchRequest) {
    return api<ThreadMetadata>(`/threads/${encodeURIComponent(threadId)}`, {
      method: 'PATCH',
      body,
    })
  }

  function deleteThread(threadId: string) {
    return api<void>(`/threads/${encodeURIComponent(threadId)}`, { method: 'DELETE' })
  }

  function listSessionThreads(sessionId: string) {
    return api<ThreadListResponse>(`/sessions/${encodeURIComponent(sessionId)}/threads`)
  }

  function deleteSession(sessionId: string) {
    return api<void>(`/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' })
  }

  function health() {
    return api<Record<string, string>>('/health')
  }

  return {
    chat,
    listThreads,
    getThread,
    patchThread,
    deleteThread,
    listSessionThreads,
    deleteSession,
    health,
  }
}
