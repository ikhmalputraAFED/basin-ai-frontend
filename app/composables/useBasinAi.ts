import { computed, ref } from 'vue'
import { useBasinAiService } from '~/services/basinAi'

/**
 * UI-facing chat state for the Basin AI page. Owns the in-memory message list
 * for the current thread and routes user actions through `useBasinAiService`.
 *
 * Stays small on purpose: persistence/history sync with the API is fine to add
 * later, but the prototype only needs to send a message and render the reply.
 */

export type ChatRole = 'user' | 'assistant'

export interface ChatCitation {
  title?: string
  url?: string
  source?: string
  [key: string]: unknown
}

export interface ExtractedParameter {
  name: string
  value: unknown
  confidence?: number
}

/** Subset of the `/chat` `result` envelope we currently surface in the UI. */
export interface AssistantResultMeta {
  reasoning?: string
  confidence?: number
  citations?: ChatCitation[]
  next_steps?: string[]
  ai_response_type?: string
  extracted_parameters?: ExtractedParameter[]
  /** Original clarification options when the model is asking for input. */
  clarification_options?: string[]
  /** True when the bubble body is the clarification question, not a final answer. */
  is_clarification?: boolean
  /** True when the model declined to answer (status:"unanswerable" / answer:null). */
  is_unanswerable?: boolean
  /** Workflow status as reported by the API ("answered", "needs_clarification", "unanswerable", ...). */
  status?: string
}

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  /** True while the assistant reply is in flight, so the UI can show a spinner. */
  pending?: boolean
  /** Present on assistant turns once the API has answered. */
  meta?: AssistantResultMeta
}

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const EXPERT_CONTEXT_STORAGE_KEY = 'basin-ai:expert-context'

/**
 * Default Expert Context shown when the user hasn't customized it yet.
 * The structure block steers the model to return rich, table-heavy
 * markdown so the UI has something professional to render.
 */
export const DEFAULT_EXPERT_CONTEXT = [
  'You are a Senior Petroleum Geologist for Basin AI.',
  'Do not ask for definitions of standard industry terms like YTF (Yet-To-Find), GDE, or PSM. If a term is ambiguous, assume the petroleum industry standard and provide the most relevant analysis you have. Focus on data-driven insights.',
  '',
  'When you answer (i.e. when you are NOT asking a clarification question), respond in GitHub-flavored markdown using this structure:',
  '',
  '## Summary',
  'Two to four sentences with the headline finding.',
  '',
  '## Key Findings',
  '- 3 to 6 bullet points, each starting with a bold takeaway followed by a short explanation.',
  '',
  '## Details',
  'Use sub-headings (###) per topic. Include at least one comparison table when comparing scenarios, basins, plays, methods, or parameters. Tables must use proper markdown pipes with a header row and an alignment row.',
  '',
  '## Recommended Next Steps',
  '- 3 to 5 short, actionable bullets.',
  '',
  '## References',
  'Markdown list of sources you relied on, with links when available.',
  '',
  'Keep numbers concrete (units, ranges, dates). Prefer tables over long paragraphs whenever you have more than two comparable items.',
].join('\n')

function loadStoredExpertContext(): string {
  if (typeof window === 'undefined') return DEFAULT_EXPERT_CONTEXT
  try {
    const raw = window.localStorage.getItem(EXPERT_CONTEXT_STORAGE_KEY)
    return raw === null ? DEFAULT_EXPERT_CONTEXT : raw
  } catch {
    return DEFAULT_EXPERT_CONTEXT
  }
}

function persistExpertContext(value: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(EXPERT_CONTEXT_STORAGE_KEY, value)
  } catch {
    // localStorage may be disabled (private mode); fail silently.
  }
}

/**
 * Pull the human-readable answer out of the `/chat` JSON envelope.
 *
 * The FSM Assistant uses two related shapes depending on the workflow stage:
 *
 *   A) Wrapped (status:"answered"):
 *      { result: { answer, reasoning, citations, next_steps, ai_response_type,
 *                  confidence, ... },
 *        clarification_needed: false, ... }
 *
 *   B) Top-level (status:"needs_clarification"):
 *      { status, answer: null, reasoning, citations, confidence,
 *        clarification_question, clarification_options, next_steps,
 *        ai_response_type, extracted_parameters, ... }
 *
 * We pull from `result.*` first, then fall back to top-level keys so both
 * shapes render the same way: an answer body, a `reasoning` block under it,
 * and `next_steps` as quick-reply chips. When the model is asking for
 * clarification, the question becomes the answer body and the options are
 * promoted to next_steps so the user can tap them.
 */
function extractReply(payload: unknown): { answer: string; meta?: AssistantResultMeta } {
  if (payload == null) return { answer: '' }
  if (typeof payload === 'string') return { answer: payload }

  const obj = payload as Record<string, unknown>
  const result = (obj.result ?? {}) as Record<string, unknown>

  /** Read first defined value across (result.*, top-level.*). */
  const pick = <T = unknown>(...keys: string[]): T | undefined => {
    for (const k of keys) {
      if (result[k] !== undefined && result[k] !== null) return result[k] as T
      if (obj[k] !== undefined && obj[k] !== null) return obj[k] as T
    }
    return undefined
  }

  const reasoning = pick<string>('reasoning')
  const confidence = pick<number>('confidence')
  const aiResponseType = pick<string>('ai_response_type')
  const citations = pick<ChatCitation[]>('citations')
  const nextStepsRaw = pick<unknown[]>('next_steps')
  const extractedParamsRaw = pick<unknown[]>('extracted_parameters')

  // Decide what the bubble text should be.
  const status = (obj.status ?? result.status) as string | undefined
  const clarificationNeeded =
    obj.clarification_needed === true ||
    result.clarification_needed === true ||
    status === 'needs_clarification'
  const clarificationQuestion = pick<string>('clarification_question')
  const clarificationOptions = pick<unknown[]>('clarification_options')
  const answerText = pick<string>('answer')

  let bodyText = ''
  let mergedNextSteps: string[] = []
  let clarificationOptionsList: string[] = []
  let isClarification = false
  let isUnanswerable = false

  if (Array.isArray(nextStepsRaw)) {
    mergedNextSteps = (nextStepsRaw as unknown[]).filter((x): x is string => typeof x === 'string')
  }

  // Status values the FSM API uses for "I can't answer this".
  const declinedStatus =
    status === 'unanswerable' ||
    status === 'failed' ||
    status === 'error' ||
    status === 'declined'

  // The API explicitly set answer:null AND didn't ask for clarification — that
  // means it declined. Promote `reasoning` to the bubble body so the user sees
  // *why* instead of an empty bubble or a JSON dump.
  const answerIsExplicitlyNull =
    !clarificationNeeded && (answerText === undefined || answerText === '') && reasoning

  if (clarificationNeeded && typeof clarificationQuestion === 'string' && clarificationQuestion.trim().length > 0) {
    bodyText = clarificationQuestion
    isClarification = true
    if (Array.isArray(clarificationOptions)) {
      clarificationOptionsList = (clarificationOptions as unknown[]).filter(
        (x): x is string => typeof x === 'string',
      )
      // Surface clarification options as the primary quick replies; keep any
      // separate next_steps after them so the user still sees the broader
      // suggestions the model offered.
      mergedNextSteps = [
        ...clarificationOptionsList,
        ...mergedNextSteps.filter((s) => !clarificationOptionsList.includes(s)),
      ]
    }
  } else if (typeof answerText === 'string' && answerText.trim().length > 0) {
    bodyText = answerText
  } else if (declinedStatus || answerIsExplicitlyNull) {
    // No answer + reasoning available → render the reasoning as the answer
    // and flag the message as "unanswerable" so the UI can label it clearly.
    bodyText = typeof reasoning === 'string' && reasoning.trim().length > 0
      ? reasoning
      : 'I’m unable to answer this with the information available.'
    isUnanswerable = true
  } else {
    // Legacy / unknown shape — keep the chat alive.
    const fallbacks = [obj.message, obj.response, obj.reply, obj.content, obj.text]
    for (const c of fallbacks) {
      if (typeof c === 'string' && c.trim().length > 0) {
        bodyText = c
        break
      }
    }
    if (!bodyText) bodyText = JSON.stringify(payload)
  }

  const meta: AssistantResultMeta = {}
  if (typeof reasoning === 'string') meta.reasoning = reasoning
  if (typeof confidence === 'number') meta.confidence = confidence
  if (typeof aiResponseType === 'string') meta.ai_response_type = aiResponseType
  if (typeof status === 'string') meta.status = status
  if (Array.isArray(citations)) meta.citations = citations
  if (mergedNextSteps.length > 0) meta.next_steps = mergedNextSteps
  if (clarificationOptionsList.length > 0) meta.clarification_options = clarificationOptionsList
  if (isClarification) meta.is_clarification = true
  if (isUnanswerable) meta.is_unanswerable = true

  if (Array.isArray(extractedParamsRaw)) {
    const params = (extractedParamsRaw as unknown[])
      .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
      .map((p) => ({
        name: typeof p.name === 'string' ? p.name : '',
        value: p.value,
        confidence: typeof p.confidence === 'number' ? p.confidence : undefined,
      }))
      .filter((p) => p.name.length > 0)
    if (params.length > 0) meta.extracted_parameters = params
  }

  return { answer: bodyText, meta: Object.keys(meta).length > 0 ? meta : undefined }
}

export function useBasinAi() {
  const service = useBasinAiService()

  const threadId = ref<string>(newId())
  const messages = ref<ChatMessage[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const webSearchEnabled = ref(true)

  /**
   * "Expert Context" prompt the user can edit in the settings panel.
   * Persisted in localStorage; injected as a prefix on the first user turn
   * of a thread so the FSM Assistant uses it as guidance without needing
   * a dedicated system-prompt field on the API.
   */
  const expertContext = ref<string>(loadStoredExpertContext())
  function saveExpertContext(value: string) {
    expertContext.value = value
    persistExpertContext(value)
  }
  function resetExpertContext() {
    saveExpertContext(DEFAULT_EXPERT_CONTEXT)
  }

  const isEmpty = computed(() => messages.value.length === 0)

  /** Quick-reply chips for the most recent assistant turn, if any. */
  const followUpSuggestions = computed<string[]>(() => {
    for (let i = messages.value.length - 1; i >= 0; i--) {
      const m = messages.value[i]
      if (m && m.role === 'assistant' && !m.pending) {
        return m.meta?.next_steps ?? []
      }
    }
    return []
  })

  function newThread() {
    threadId.value = newId()
    messages.value = []
    error.value = null
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading.value) return

    error.value = null

    const userMsg: ChatMessage = { id: newId(), role: 'user', content: trimmed }
    const pendingReply: ChatMessage = { id: newId(), role: 'assistant', content: '', pending: true }
    messages.value = [...messages.value, userMsg, pendingReply]

    // Inject the Expert Context once per thread on the first user turn.
    // The FSM API has no dedicated system-prompt field, so we prepend it
    // to the user's message and keep subsequent turns clean.
    const isFirstTurn = messages.value.filter((m) => m.role === 'user').length === 1
    const ctx = expertContext.value.trim()
    const apiMessage = isFirstTurn && ctx.length > 0 ? `${ctx}\n\n${trimmed}` : trimmed

    loading.value = true
    try {
      const response = await service.chat({
        message: apiMessage,
        thread_id: threadId.value,
        web_search: webSearchEnabled.value,
      })
      const { answer, meta } = extractReply(response)
      messages.value = messages.value.map((m) =>
        m.id === pendingReply.id
          ? { ...m, content: answer, meta, pending: false }
          : m,
      )
    } catch (e: any) {
      const msg = e?.message || 'Failed to reach Basin AI.'
      error.value = msg
      messages.value = messages.value.map((m) =>
        m.id === pendingReply.id
          ? { ...m, content: `⚠️ ${msg}`, pending: false }
          : m,
      )
    } finally {
      loading.value = false
    }
  }

  return {
    threadId,
    messages,
    loading,
    error,
    webSearchEnabled,
    isEmpty,
    followUpSuggestions,
    expertContext,
    saveExpertContext,
    resetExpertContext,
    sendMessage,
    newThread,
  }
}
