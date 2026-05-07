<template>
  <!--
    Use `h-screen` (not `min-h-screen`) so the page is locked to the viewport.
    Combined with `overflow-hidden`, this guarantees that long assistant
    answers stay inside `.bai-scroller` instead of growing the document and
    making the user scroll the whole page.
  -->
  <div class="bai-page relative flex h-screen flex-col overflow-hidden">
    <!-- Top bar -->
    <header class="bai-topbar relative z-30 flex h-16 shrink-0 items-center justify-between px-6">
      <div class="flex items-center gap-3">
        <span class="bai-logo flex h-9 w-9 items-center justify-center rounded-2xl">
          <FlaskConical class="h-4 w-4 text-white" aria-hidden="true" />
        </span>
        <span class="text-base font-semibold tracking-tight" style="color: var(--bai-text)">Basin AI</span>
      </div>

      <nav class="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex" aria-label="Basin AI sections">
        <button
          v-for="tab in topNavTabs"
          :key="tab"
          type="button"
          class="bai-nav-tab"
        >
          {{ tab }}
        </button>
      </nav>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="bai-icon-btn"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="toggleDarkMode"
        >
          <Sun v-if="isDark" class="h-4 w-4" />
          <Moon v-else class="h-4 w-4" />
        </button>
      </div>
    </header>

    <!--
      Stage layout
      ─────────────
      Three modes drive the workspace:
        • chat-only  → chat covers the page (default while the map is WIP)
        • split      → 70% map (left) + 30% chat (right), flush
        • map-only   → map covers the page, chat collapsed
      A floating orb appears in the opposite corner whenever a panel is hidden,
      so the user can bring it back without hunting for a menu.
    -->
    <main class="relative flex min-h-0 flex-1 flex-row">
      <!-- Map pane (left). Hidden in chat-only mode. -->
      <section
        v-if="layout !== 'chat-only'"
        class="bai-map-pane relative flex min-h-0 flex-col"
        :class="layout === 'split' ? 'w-[70%] min-w-0' : 'flex-1'"
        aria-label="Map workspace"
      >
        <div class="absolute inset-0 flex items-center justify-center px-6 py-8">
          <div class="bai-card w-full max-w-md p-8 text-center">
            <div class="bai-hero-icon mx-auto mb-6">
              <FlaskConical class="h-7 w-7" aria-hidden="true" />
            </div>
            <h1 class="bai-h1">Map workspace</h1>
            <p class="bai-body mx-auto mt-3 max-w-sm">
              Under construction. Once ready, basins surfaced in your AI chat will render here side-by-side
              with the conversation.
            </p>
            <button
              type="button"
              class="bai-pill mt-7"
              @click="setLayout('chat-only')"
            >
              <span class="bai-pulse-dot" aria-hidden="true" />
              Expand chat instead
            </button>
          </div>
        </div>
      </section>

      <!-- Chat pane (right). Hidden in map-only mode. -->
      <aside
        v-if="layout !== 'map-only'"
        class="bai-chat-shell relative flex min-h-0 flex-col overflow-hidden"
        :class="layout === 'split'
          ? 'w-[30%] min-w-[20rem] border-l border-l-[var(--bai-edge)] !rounded-none !shadow-none'
          : 'flex-1'"
        aria-label="Basin AI chat"
      >
          <!-- Header -->
          <header class="bai-chat-header flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4">
            <div class="flex min-w-0 items-center gap-3">
              <span class="bai-logo flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl">
                <FlaskConical class="h-4 w-4 text-white" aria-hidden="true" />
              </span>
              <div class="min-w-0">
                <p class="truncate text-base font-semibold" style="color: var(--bai-text)">Basin AI</p>
                <p class="bai-eyebrow">Expert mode</p>
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-1">
              <div class="bai-segment mr-1" role="group" aria-label="Workspace layout">
                <button
                  type="button"
                  class="bai-segment-btn"
                  :class="{ 'is-active': layout === 'chat-only' }"
                  :aria-pressed="layout === 'chat-only'"
                  aria-label="Chat covers full page"
                  @click="setLayout('chat-only')"
                >
                  <LayoutGrid class="h-4 w-4" />
                </button>
                <button
                  type="button"
                  class="bai-segment-btn"
                  :class="{ 'is-active': layout === 'split' }"
                  :aria-pressed="layout === 'split'"
                  aria-label="Split — map (70%) and chat (30%)"
                  @click="setLayout('split')"
                >
                  <Columns2 class="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                class="bai-icon-btn"
                :disabled="loading"
                aria-label="New chat"
                @click="onNewChat"
              >
                <Plus class="h-4 w-4" />
              </button>
              <button
                type="button"
                class="bai-icon-btn"
                :class="{ 'is-active': settingsOpen }"
                aria-label="Expert context settings"
                @click="openSettings"
              >
                <Settings class="h-4 w-4" />
              </button>
              <button
                type="button"
                class="bai-icon-btn"
                aria-label="Hide chat — show map only"
                @click="setLayout('map-only')"
              >
                <Minimize2 class="h-4 w-4" />
              </button>
            </div>
          </header>

          <!-- Conversation -->
          <div ref="scrollerRef" class="bai-scroller flex-1 min-h-0 overflow-y-auto px-5 py-6">
            <div class="bai-bubble bai-bubble-assistant mb-5 inline-block max-w-[88%]">
              Hi, I am Basin AI. How can I help?
            </div>

            <div v-if="isEmpty" class="space-y-3">
              <p class="bai-eyebrow">Suggested questions</p>
              <div class="flex flex-col gap-2">
                <button
                  v-for="prompt in suggestedPrompts"
                  :key="prompt"
                  type="button"
                  class="bai-suggest"
                  :disabled="loading"
                  @click="sendMessage(prompt)"
                >
                  {{ prompt }}
                </button>
              </div>
            </div>

            <ul v-else class="space-y-4">
              <li
                v-for="m in messages"
                :key="m.id"
                class="flex"
                :class="m.role === 'user' ? 'justify-end' : 'justify-start'"
              >
                <div
                  class="bai-bubble break-words"
                  :class="m.role === 'user'
                    ? 'bai-bubble-user max-w-[85%] whitespace-pre-wrap'
                    : 'bai-bubble-assistant w-full min-w-0 max-w-full'"
                >
                  <div v-if="m.pending" class="space-y-2.5">
                    <div class="inline-flex items-center gap-2" style="color: var(--bai-text-muted)">
                      <Brain class="h-4 w-4 animate-pulse" style="color: var(--bai-accent-text)" />
                      <span class="thinking-shimmer text-[13px]">{{ thinkingStage }}</span>
                    </div>
                    <div class="flex gap-1.5" aria-hidden="true">
                      <span class="bai-think-dot" />
                      <span class="bai-think-dot [animation-delay:160ms]" />
                      <span class="bai-think-dot [animation-delay:320ms]" />
                    </div>
                  </div>
                  <template v-else-if="m.role === 'assistant'">
                    <div
                      v-if="m.meta && (m.meta.is_clarification || m.meta.is_unanswerable || typeof m.meta.confidence === 'number')"
                      class="mb-3 flex flex-wrap items-center gap-2"
                    >
                      <span v-if="m.meta.is_clarification" class="bai-badge bai-badge-warn">
                        Needs clarification
                      </span>
                      <span v-if="m.meta.is_unanswerable" class="bai-badge bai-badge-danger">
                        Unable to answer
                      </span>
                      <span v-if="typeof m.meta.confidence === 'number'" class="bai-confidence">
                        <span class="bai-eyebrow !mb-0">Confidence</span>
                        <span class="bai-confidence-bar">
                          <span
                            class="bai-confidence-fill"
                            :class="m.meta.confidence >= 0.75 ? 'is-high' : m.meta.confidence >= 0.5 ? 'is-mid' : 'is-low'"
                            :style="{ width: `${Math.round(m.meta.confidence * 100)}%` }"
                          />
                        </span>
                        <span class="font-mono text-[12px]" style="color: var(--bai-text)">{{ Math.round(m.meta.confidence * 100) }}%</span>
                      </span>
                    </div>

                    <BasinAiMessage :source="m.content" />

                    <BasinAiResultPanels v-if="m.meta" :meta="m.meta" class="mt-4" />

                    <details
                      v-if="m.meta?.reasoning"
                      class="basin-ai-thought bai-thought mt-4"
                    >
                      <summary class="bai-thought-summary">
                        <Brain class="h-3.5 w-3.5" />
                        Thought process
                        <ChevronDown class="ml-auto h-3.5 w-3.5 transition-transform basin-ai-thought-chevron" />
                      </summary>
                      <div class="bai-thought-body">
                        <BasinAiMessage :source="m.meta.reasoning" />
                      </div>
                    </details>
                  </template>
                  <span v-else>{{ m.content }}</span>
                </div>
              </li>
            </ul>

            <div
              v-if="!isEmpty && followUpSuggestions.length > 0 && !loading"
              class="mt-5 space-y-3"
            >
              <p class="bai-eyebrow">Suggested next steps</p>
              <div class="flex flex-col gap-2">
                <button
                  v-for="step in followUpSuggestions"
                  :key="step"
                  type="button"
                  class="bai-suggest"
                  @click="sendMessage(step)"
                >
                  {{ step }}
                </button>
              </div>
            </div>
          </div>

          <!-- Footer / input -->
          <footer class="bai-chat-footer px-5 py-4">
            <button
              type="button"
              class="bai-toggle mb-3"
              :class="{ 'is-on': webSearchEnabled }"
              :aria-pressed="webSearchEnabled"
              @click="webSearchEnabled = !webSearchEnabled"
            >
              <span class="bai-toggle-track">
                <span class="bai-toggle-thumb" />
              </span>
              <span class="bai-eyebrow !mb-0">
                Web search {{ webSearchEnabled ? 'on' : 'off' }}
              </span>
            </button>

            <form class="bai-input-shell" @submit.prevent="onSubmit">
              <textarea
                ref="inputRef"
                v-model="draft"
                rows="1"
                placeholder="Ask a question about this basin…"
                class="bai-input"
                :disabled="loading"
                @keydown.enter.exact.prevent="onSubmit"
              />
              <button
                type="submit"
                class="bai-send"
                :disabled="loading || draft.trim().length === 0"
                aria-label="Send"
              >
                <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
                <Send v-else class="h-4 w-4" />
              </button>
            </form>
            <p v-if="error" class="mt-2 text-xs" style="color: var(--bai-danger)">{{ error }}</p>
          </footer>

          <!-- Expert Context settings overlay -->
          <transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 translate-y-2"
          >
            <div
              v-if="settingsOpen"
              class="bai-settings absolute inset-0 z-10 flex flex-col"
              role="dialog"
              aria-label="Expert context"
            >
              <header class="flex items-start justify-between gap-3 px-6 pt-6 pb-5">
                <div class="flex items-start gap-3">
                  <span class="bai-logo flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
                    <Settings class="h-4 w-4 text-white" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 class="text-base font-semibold" style="color: var(--bai-text)">Expert context</h3>
                    <p class="mt-0.5 text-sm" style="color: var(--bai-text-subtle)">
                      Configure AI personality and industry constraints
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  class="bai-icon-btn"
                  aria-label="Close settings"
                  @click="closeSettings"
                >
                  <X class="h-4 w-4" />
                </button>
              </header>

              <div class="flex-1 overflow-y-auto px-6 pb-4">
                <p class="bai-eyebrow">Expert context &amp; constraints</p>
                <textarea
                  v-model="contextDraft"
                  rows="10"
                  class="bai-textarea block w-full resize-none"
                  spellcheck="true"
                />
                <p class="mt-3 text-xs italic" style="color: var(--bai-text-subtle)">
                  This context is injected into your first message to guide the AI's reasoning.
                </p>
              </div>

              <footer class="flex items-center justify-between gap-3 border-t px-6 py-4" style="border-color: var(--bai-edge)">
                <button
                  type="button"
                  class="bai-link-btn"
                  :disabled="contextDraft === DEFAULT_EXPERT_CONTEXT"
                  @click="onResetContext"
                >
                  Reset
                </button>
                <button
                  type="button"
                  class="bai-cta"
                  :disabled="!isContextDirty"
                  @click="onSaveContext"
                >
                  Save changes
                </button>
              </footer>
            </div>
          </transition>
        </aside>

      <!--
        Floating chat orb. Only shown in `map-only` mode where there's no
        chat header to host a "show chat" button. In `chat-only` mode the
        chat header already exposes the layout segmented control, so a
        floating "show map" orb would just clutter the input area.
      -->
      <button
        v-show="layout === 'map-only'"
        type="button"
        class="bai-orb bai-orb-chat fixed bottom-6 right-6 z-30"
        aria-label="Open Basin AI chat"
        @click="setLayout('split')"
      >
        <FlaskConical class="h-6 w-6 text-white drop-shadow" aria-hidden="true" />
      </button>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Brain, ChevronDown, Columns2, FlaskConical, LayoutGrid, Loader2, Minimize2, Moon, Plus, Send, Settings, Sun, X } from 'lucide-vue-next'
import { DEFAULT_EXPERT_CONTEXT, useBasinAi } from '~/composables/useBasinAi'
import { useDarkMode } from '~/composables/useDarkMode'
import BasinAiMessage from '~/components/features/basin-ai/BasinAiMessage.vue'
import BasinAiResultPanels from '~/components/features/basin-ai/BasinAiResultPanels.vue'

const { isDark, toggleDarkMode } = useDarkMode()

useHead({ title: 'Basin AI' })

const topNavTabs = ['Workspace', 'Analysis', 'Reports'] as const

const suggestedPrompts = [
  'Analyze stratigraphy for Malay Basin',
  'YTF potential for Guyana basin',
  'Check seismic QC for Zagros region',
  'Set up a DionisosFlow for Malay Basin',
] as const

const {
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
} = useBasinAi()

const settingsOpen = ref(false)
const contextDraft = ref(expertContext.value)
const isContextDirty = computed(() => contextDraft.value !== expertContext.value)

function openSettings() {
  contextDraft.value = expertContext.value
  settingsOpen.value = true
}

function closeSettings() {
  settingsOpen.value = false
}

function onSaveContext() {
  saveExpertContext(contextDraft.value)
  settingsOpen.value = false
}

function onResetContext() {
  resetExpertContext()
  contextDraft.value = DEFAULT_EXPERT_CONTEXT
}

// --- Thought-process indicator -----------------------------------------------
// The /chat endpoint is request/response (no token streaming), so we surface
// progress with prompt-aware "stages" that cycle while the request is in
// flight. The real reasoning (`result.reasoning`) is rendered afterward as
// a collapsible block under the message.
const FALLBACK_STAGES: readonly string[] = [
  'Reading your prompt…',
  'Recalling Basin AI context…',
  'Reasoning through the problem…',
  'Drafting a response…',
]

/**
 * Pick stage labels that reference what the user actually asked, so the
 * indicator feels grounded in their prompt instead of canned filler.
 *
 * Heuristic only — no ML, just regexes. Better than a static list, cheap to
 * maintain. Order: open with a verbatim hint, then a domain step keyed off
 * the verb / deliverable, finish with a "drafting" step that mentions the
 * subject (basin/region) when we found one.
 */
function planThinkingStages(prompt: string): string[] {
  const text = prompt.trim()
  if (!text) return [...FALLBACK_STAGES]

  const lower = text.toLowerCase()
  const stages: string[] = []

  // 1) Open with a short echo of the user's prompt so they know we read it.
  const opener = text.length > 60 ? `${text.slice(0, 60).trim()}…` : text
  stages.push(`Reading: “${opener}”`)

  // 2) Try to extract the subject (basin / region / play / well).
  const basinMatch = text.match(/\b([A-Z][\w-]*(?:\s+[A-Z][\w-]*){0,3})\s+(?:basin|sub-basin|trough|delta|shelf|margin|play|field|region|formation)\b/i)
  const subject = basinMatch?.[1]?.trim()

  // 3) Pick a domain step from the most specific intent we recognise.
  type Intent = { match: RegExp; step: string }
  const intents: Intent[] = [
    { match: /\b(stratigraph|chronostrat|sequence)\w*/i,             step: 'Reviewing stratigraphic framework…' },
    { match: /\b(seismic|qc|amplitude|interpret)\w*/i,               step: 'Inspecting seismic context…' },
    { match: /\b(well\s*log|petrophys|porosity|saturation|net[-\s]?to[-\s]?gross)\w*/i,
                                                                       step: 'Cross-checking petrophysical data…' },
    { match: /\b(source\s*rock|toc|kerogen|maturity|geochem)\w*/i,    step: 'Evaluating source-rock indicators…' },
    { match: /\b(reservoir|sand|carbonate|reservoir\s*quality)\w*/i,  step: 'Characterising reservoir intervals…' },
    { match: /\b(seal|trap|migration|charge)\w*/i,                   step: 'Assessing trap and migration…' },
    { match: /\b(ytf|yet[-\s]?to[-\s]?find|prospect|lead|resource|stp|gip|prospective\s*resource)\w*/i,
                                                                       step: 'Estimating prospectivity…' },
    { match: /\b(dionisos|cougar|openflow|pal[ae]o|forward\s*model|fsm|psm)\w*/i,
                                                                       step: 'Setting up the modelling workflow…' },
    { match: /\b(compare|comparison|vs\.?|versus|benchmark)\w*/i,    step: 'Comparing options…' },
    { match: /\b(table|matrix|summari[sz]e|summary|breakdown)\w*/i,   step: 'Structuring the answer…' },
    { match: /\b(map|location|coordinate|geolocate|geospatial)\w*/i,  step: 'Locating the area…' },
    { match: /\b(report|document|pdf|export)\w*/i,                   step: 'Pulling reference material…' },
    { match: /\b(troubleshoot|debug|error|why\s+is|problem)\w*/i,     step: 'Diagnosing the issue…' },
    { match: /\b(recommend|suggest|advice|what\s+should)\w*/i,        step: 'Weighing recommendations…' },
  ]
  const intent = intents.find((i) => i.match.test(lower))
  if (intent) stages.push(intent.step)
  else stages.push('Reasoning through the problem…')

  // 4) Subject-specific drafting step, if we caught a basin/play/region.
  stages.push(subject ? `Drafting insights for ${subject}…` : 'Drafting a response…')
  return stages
}

const thinkingStage = ref<string>(FALLBACK_STAGES[0]!)
let thinkingTimer: ReturnType<typeof setInterval> | null = null

function startThinkingTimer() {
  // Pull the most recent user turn — that's the prompt currently in flight,
  // regardless of whether it came from the input or a suggestion chip.
  const lastUser = [...messages.value].reverse().find((m) => m.role === 'user')
  const stages = lastUser ? planThinkingStages(lastUser.content) : [...FALLBACK_STAGES]

  let i = 0
  thinkingStage.value = stages[0]!
  thinkingTimer = setInterval(() => {
    i = (i + 1) % stages.length
    thinkingStage.value = stages[i]!
  }, 1500)
}

function stopThinkingTimer() {
  if (thinkingTimer) {
    clearInterval(thinkingTimer)
    thinkingTimer = null
  }
}

watch(loading, (isLoading) => {
  if (isLoading) startThinkingTimer()
  else stopThinkingTimer()
})

onBeforeUnmount(() => stopThinkingTimer())

// Three workspace layouts. `chat-only` is the default while the map workspace
// is still under construction; once the map is live we'll likely swap this to
// `split` so users see both panes immediately.
type LayoutMode = 'chat-only' | 'split' | 'map-only'

const LAYOUT_STORAGE_KEY = 'basin-ai:layout'

function loadLayout(): LayoutMode {
  if (typeof window === 'undefined') return 'chat-only'
  try {
    const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (raw === 'split' || raw === 'chat-only' || raw === 'map-only') return raw
  } catch {
    // ignore
  }
  return 'chat-only'
}

const layout = ref<LayoutMode>(loadLayout())

function setLayout(mode: LayoutMode) {
  layout.value = mode
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, mode)
    } catch {
      // ignore
    }
  }
  // When the chat is becoming visible again, focus its input so the user can
  // type immediately without an extra click.
  if (mode !== 'map-only') nextTick(() => inputRef.value?.focus())
}

const draft = ref('')
const inputRef = ref<HTMLTextAreaElement | null>(null)
const scrollerRef = ref<HTMLDivElement | null>(null)

function onNewChat() {
  newThread()
  draft.value = ''
  nextTick(() => inputRef.value?.focus())
}

async function onSubmit() {
  const text = draft.value
  if (!text.trim() || loading.value) return
  draft.value = ''
  await sendMessage(text)
}

watch(
  () => messages.value.length,
  async () => {
    await nextTick()
    const el = scrollerRef.value
    if (el) el.scrollTop = el.scrollHeight
  },
)

onMounted(() => {
  // Auto-focus the chat input when the chat is visible at first paint.
  if (layout.value !== 'map-only') nextTick(() => inputRef.value?.focus())
})
</script>

<style>
/* -----------------------------------------------------------------------------
 * Basin AI page styles. Unscoped on purpose so that nested children (markdown,
 * panels, settings overlay) can read the same tokens. All colors come from
 * `var(--bai-*)` defined in the layout, so dark/light themes flip cleanly.
 * --------------------------------------------------------------------------- */

.bai-page {
  background: transparent;
  color: var(--bai-text);
}

/* --- Top bar --------------------------------------------------------------- */
.bai-topbar {
  background: color-mix(in srgb, var(--bai-bg) 80%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--bai-edge);
}

.bai-logo {
  background: linear-gradient(135deg, var(--bai-accent-from), var(--bai-accent-to));
  box-shadow: 0 10px 30px -10px color-mix(in srgb, var(--bai-accent-from) 65%, transparent);
}

.bai-nav-tab {
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--bai-text-subtle);
  transition: background-color 160ms ease, color 160ms ease;
}
.bai-nav-tab:hover {
  background: var(--bai-surface-muted);
  color: var(--bai-text);
}

/* --- Reusable controls ----------------------------------------------------- */
.bai-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2rem;
  width: 2rem;
  border-radius: 0.85rem;
  color: var(--bai-text-subtle);
  background: transparent;
  transition: background-color 160ms ease, color 160ms ease, transform 120ms ease;
}
.bai-icon-btn:hover { background: var(--bai-surface-muted); color: var(--bai-text); }
.bai-icon-btn.is-active { background: var(--bai-surface-muted); color: var(--bai-accent-text); }
.bai-icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.bai-segment {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: 0.85rem;
  background: var(--bai-surface-muted);
  border: 1px solid var(--bai-edge);
}
.bai-segment-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 1.6rem;
  width: 1.85rem;
  border-radius: 0.65rem;
  color: var(--bai-text-subtle);
  transition: background-color 160ms ease, color 160ms ease;
}
.bai-segment-btn:hover { color: var(--bai-text); }
.bai-segment-btn.is-active {
  background: var(--bai-surface-strong);
  color: var(--bai-accent-text);
  box-shadow: 0 4px 12px -8px rgba(0,0,0,0.25);
}

.bai-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 1.1rem;
  border-radius: 999px;
  border: 1px solid var(--bai-accent-soft-2);
  background: var(--bai-accent-soft);
  color: var(--bai-accent-text);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  transition: background-color 160ms ease, color 160ms ease;
}
.bai-pill:hover {
  background: var(--bai-accent-soft-2);
  color: var(--bai-text);
}

.bai-pulse-dot {
  height: 0.5rem;
  width: 0.5rem;
  border-radius: 999px;
  background: var(--bai-accent-from);
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--bai-accent-from) 60%, transparent);
  animation: bai-pulse 1.8s ease-out infinite;
}
@keyframes bai-pulse {
  0%   { box-shadow: 0 0 0 0 color-mix(in srgb, var(--bai-accent-from) 70%, transparent); }
  100% { box-shadow: 0 0 0 12px transparent; }
}

.bai-eyebrow {
  margin: 0 0 0.55rem;
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--bai-text-subtle);
}

.bai-h1 {
  font-size: 1.4rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--bai-text);
}
.bai-body {
  font-size: 0.95rem;
  line-height: 1.65;
  color: var(--bai-text-muted);
}

/* --- Cards ----------------------------------------------------------------- */
.bai-card {
  border-radius: var(--bai-radius-lg);
  border: 1px solid var(--bai-edge);
  background: var(--bai-surface);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: var(--bai-shadow-md);
}

.bai-hero-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 3.5rem;
  width: 3.5rem;
  border-radius: 1.25rem;
  background: var(--bai-accent-soft);
  color: var(--bai-accent-text);
  border: 1px solid var(--bai-accent-soft-2);
}

/* --- Chat shell (the floating, alive panel) ------------------------------- */
.bai-chat-shell {
  border-radius: var(--bai-radius-lg);
  border: 1px solid var(--bai-edge);
  background: var(--bai-surface);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  box-shadow: var(--bai-shadow-lg);
  position: relative;
}
.bai-chat-shell::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(140deg, var(--bai-accent-soft-2), transparent 40%, var(--bai-accent-soft) 90%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
          mask-composite: exclude;
  pointer-events: none;
  opacity: 0.7;
}

.bai-chat-header {
  border-bottom: 1px solid var(--bai-edge);
  background: linear-gradient(180deg, color-mix(in srgb, var(--bai-surface) 70%, transparent), transparent);
}

.bai-chat-footer {
  border-top: 1px solid var(--bai-edge);
  background: linear-gradient(0deg, color-mix(in srgb, var(--bai-surface) 70%, transparent), transparent);
}

/* --- Conversation scroller ------------------------------------------------- */
.bai-scroller {
  scrollbar-width: thin;
  scrollbar-color: var(--bai-edge-strong) transparent;
}
.bai-scroller::-webkit-scrollbar { width: 8px; }
.bai-scroller::-webkit-scrollbar-track { background: transparent; }
.bai-scroller::-webkit-scrollbar-thumb {
  background: var(--bai-edge-strong);
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

/* --- Bubbles --------------------------------------------------------------- */
.bai-bubble {
  border-radius: 1.25rem;
  padding: 0.85rem 1.1rem;
  font-size: 0.95rem;
  line-height: 1.6;
}
.bai-bubble-assistant {
  background: var(--bai-surface-muted);
  border: 1px solid var(--bai-edge);
  color: var(--bai-text);
  border-bottom-left-radius: 0.4rem;
}
.bai-bubble-user {
  background: linear-gradient(135deg, var(--bai-accent-from), var(--bai-accent-to));
  color: #fff;
  border-bottom-right-radius: 0.4rem;
  box-shadow: 0 14px 32px -16px color-mix(in srgb, var(--bai-accent-from) 75%, transparent);
}

/* --- Suggestion buttons ---------------------------------------------------- */
.bai-suggest {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.75rem 1rem;
  border-radius: 1rem;
  font-size: 0.9rem;
  color: var(--bai-text);
  background: var(--bai-surface-muted);
  border: 1px solid var(--bai-edge);
  transition: border-color 160ms ease, background-color 160ms ease, transform 120ms ease;
}
.bai-suggest:hover {
  border-color: var(--bai-accent-soft-2);
  background: var(--bai-accent-soft);
  transform: translateY(-1px);
}
.bai-suggest:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

/* --- Badges + confidence --------------------------------------------------- */
.bai-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.bai-badge-warn {
  background: color-mix(in srgb, var(--bai-warning) 15%, transparent);
  color: var(--bai-warning);
  border: 1px solid color-mix(in srgb, var(--bai-warning) 35%, transparent);
}
.bai-badge-danger {
  background: color-mix(in srgb, var(--bai-danger) 15%, transparent);
  color: var(--bai-danger);
  border: 1px solid color-mix(in srgb, var(--bai-danger) 35%, transparent);
}

.bai-confidence {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.25rem 0.65rem 0.25rem 0.7rem;
  border-radius: 999px;
  background: var(--bai-surface-muted);
  border: 1px solid var(--bai-edge);
}
.bai-confidence-bar {
  position: relative;
  height: 6px;
  width: 80px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--bai-edge);
}
.bai-confidence-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 999px;
  transition: width 220ms ease;
}
.bai-confidence-fill.is-high { background: var(--bai-success); }
.bai-confidence-fill.is-mid  { background: var(--bai-warning); }
.bai-confidence-fill.is-low  { background: var(--bai-danger); }

/* --- Thought process collapsible ------------------------------------------ */
.bai-thought {
  border-radius: 1rem;
  border: 1px solid color-mix(in srgb, var(--bai-accent-from) 25%, var(--bai-edge));
  background: var(--bai-accent-soft);
  font-size: 0.85rem;
  color: var(--bai-text);
}
.bai-thought-summary {
  display: flex;
  cursor: pointer;
  list-style: none;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 0.85rem;
  border-radius: 1rem;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--bai-accent-text);
}
.bai-thought-summary::-webkit-details-marker { display: none; }
.bai-thought-summary:hover { background: var(--bai-accent-soft-2); }
.bai-thought-body {
  border-top: 1px solid color-mix(in srgb, var(--bai-accent-from) 18%, var(--bai-edge));
  padding: 0.85rem 1rem;
  line-height: 1.7;
  color: var(--bai-text-muted);
}
.basin-ai-thought[open] .basin-ai-thought-chevron { transform: rotate(180deg); }

/* --- Footer (web search toggle + input + send) ---------------------------- */
.bai-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  background: transparent;
  cursor: pointer;
}
.bai-toggle-track {
  position: relative;
  height: 18px;
  width: 32px;
  flex-shrink: 0;
  border-radius: 999px;
  background: var(--bai-edge-strong);
  transition: background-color 160ms ease;
}
.bai-toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  height: 14px;
  width: 14px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  transition: transform 180ms ease;
}
.bai-toggle.is-on .bai-toggle-track {
  background: linear-gradient(135deg, var(--bai-accent-from), var(--bai-accent-to));
}
.bai-toggle.is-on .bai-toggle-thumb {
  transform: translateX(14px);
}

.bai-input-shell { position: relative; }
.bai-input {
  display: block;
  width: 100%;
  min-height: 3rem;
  max-height: 9rem;
  resize: none;
  padding: 0.85rem 3.25rem 0.85rem 1.1rem;
  border-radius: 1.25rem;
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--bai-text);
  background: var(--bai-surface-strong);
  border: 1px solid var(--bai-edge);
  transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
}
.bai-input::placeholder { color: var(--bai-text-subtle); }
.bai-input:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--bai-accent-from) 55%, var(--bai-edge));
  box-shadow: 0 0 0 4px var(--bai-accent-soft);
}
.bai-input:disabled { opacity: 0.6; cursor: not-allowed; }

.bai-send {
  position: absolute;
  bottom: 0.45rem;
  right: 0.45rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2.25rem;
  width: 2.25rem;
  border-radius: 0.85rem;
  color: #fff;
  background: linear-gradient(135deg, var(--bai-accent-from), var(--bai-accent-to));
  box-shadow: 0 10px 24px -10px color-mix(in srgb, var(--bai-accent-from) 75%, transparent);
  transition: filter 160ms ease, transform 120ms ease;
}
.bai-send:hover { filter: brightness(1.08); }
.bai-send:active { transform: translateY(1px); }
.bai-send:disabled { opacity: 0.4; cursor: not-allowed; filter: none; }

/* --- Settings overlay ----------------------------------------------------- */
.bai-settings {
  background: var(--bai-surface-strong);
  color: var(--bai-text);
  border-radius: inherit;
}
.bai-textarea {
  padding: 0.95rem 1.1rem;
  border-radius: 1rem;
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--bai-text);
  background: var(--bai-bg-soft);
  border: 1px solid var(--bai-edge);
  transition: border-color 160ms ease, box-shadow 160ms ease;
}
.bai-textarea:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--bai-accent-from) 55%, var(--bai-edge));
  box-shadow: 0 0 0 4px var(--bai-accent-soft);
}

.bai-link-btn {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--bai-text-subtle);
  background: transparent;
  transition: color 160ms ease;
}
.bai-link-btn:hover { color: var(--bai-text); }
.bai-link-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.bai-cta {
  padding: 0.7rem 1.5rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #fff;
  background: linear-gradient(135deg, var(--bai-accent-from), var(--bai-accent-to));
  box-shadow: 0 14px 32px -14px color-mix(in srgb, var(--bai-accent-from) 75%, transparent);
  transition: filter 160ms ease;
}
.bai-cta:hover { filter: brightness(1.08); }
.bai-cta:disabled { opacity: 0.55; cursor: not-allowed; filter: none; }

/* --- Floating orbs --------------------------------------------------------
 * Two flavors:
 *  • `.bai-orb-chat` (purple) → bottom-right when only the map is visible
 *  • `.bai-orb-map`  (teal)   → bottom-left when only the chat is visible
 * Both share the same float animation so they feel "alive". */
.bai-orb {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 3.75rem;
  width: 3.75rem;
  border-radius: 999px;
  outline: none;
  cursor: pointer;
  transition: transform 140ms ease, filter 160ms ease;
  animation: bai-orb-float 4.5s ease-in-out infinite;
}
.bai-orb:hover { transform: scale(1.06); filter: brightness(1.06); }
.bai-orb:active { transform: scale(0.96); }

.bai-orb-chat {
  background: linear-gradient(135deg, var(--bai-accent-from), var(--bai-accent-to));
  box-shadow:
    0 18px 48px -12px color-mix(in srgb, var(--bai-accent-from) 65%, transparent),
    0 0 0 4px color-mix(in srgb, var(--bai-accent-from) 18%, transparent);
}

@keyframes bai-orb-float {
  0%, 100% { translate: 0 0; }
  50%      { translate: 0 -4px; }
}

/* --- Map pane ------------------------------------------------------------- */
.bai-map-pane {
  background:
    radial-gradient(80% 60% at 30% 20%, var(--bai-accent-soft) 0%, transparent 60%),
    radial-gradient(60% 80% at 80% 80%, var(--bai-surface-muted) 0%, transparent 60%),
    var(--bai-bg-soft);
}

/* --- Thinking indicator --------------------------------------------------- */
.thinking-shimmer {
  background: linear-gradient(
    90deg,
    var(--bai-text-muted) 0%,
    var(--bai-accent-text) 50%,
    var(--bai-text-muted) 100%
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: basin-ai-shimmer 2.4s ease-in-out infinite;
}
@keyframes basin-ai-shimmer {
  0%   { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

.bai-think-dot {
  height: 0.4rem;
  width: 0.4rem;
  border-radius: 999px;
  background: var(--bai-accent-from);
  animation: basin-ai-thought-dot 1.2s ease-in-out infinite;
}
@keyframes basin-ai-thought-dot {
  0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
  40%           { transform: scale(1);   opacity: 1; }
}
</style>
