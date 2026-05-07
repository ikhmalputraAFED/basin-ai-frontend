<template>
  <div v-if="hasContent" class="bai-panels space-y-3">
    <!-- Extracted parameters -->
    <section
      v-if="meta.extracted_parameters && meta.extracted_parameters.length > 0"
      class="bai-panel"
    >
      <header class="bai-panel-header">
        <span class="bai-panel-title">Extracted parameters</span>
      </header>
      <div class="overflow-x-auto">
        <table class="bai-panel-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Value</th>
              <th class="text-right">Confidence</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(p, i) in meta.extracted_parameters"
              :key="`${p.name}-${i}`"
            >
              <td class="bai-panel-strong">{{ p.name }}</td>
              <td>{{ formatValue(p.value) }}</td>
              <td class="text-right font-mono bai-panel-muted">
                {{ typeof p.confidence === 'number' ? `${Math.round(p.confidence * 100)}%` : '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Citations -->
    <section
      v-if="meta.citations && meta.citations.length > 0"
      class="bai-panel"
    >
      <header class="bai-panel-header">
        <span class="bai-panel-title">References</span>
      </header>
      <div class="overflow-x-auto">
        <table class="bai-panel-table">
          <thead>
            <tr>
              <th class="w-10">#</th>
              <th>Title</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(c, i) in meta.citations" :key="i">
              <td class="font-mono bai-panel-muted">{{ i + 1 }}</td>
              <td class="bai-panel-strong">
                <a
                  v-if="hasUrl(c)"
                  :href="c.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="bai-panel-link"
                >
                  {{ c.title || c.url }}
                </a>
                <span v-else>{{ c.title || '—' }}</span>
              </td>
              <td class="bai-panel-muted">{{ c.source || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AssistantResultMeta, ChatCitation } from '~/composables/useBasinAi'

const props = defineProps<{
  meta: AssistantResultMeta
}>()

const hasContent = computed(
  () =>
    (props.meta.extracted_parameters?.length ?? 0) > 0 ||
    (props.meta.citations?.length ?? 0) > 0,
)

function hasUrl(c: ChatCitation): c is ChatCitation & { url: string } {
  return typeof c?.url === 'string' && c.url.length > 0
}

function formatValue(v: unknown): string {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}
</script>

<style scoped>
.bai-panel {
  overflow: hidden;
  border-radius: 1rem;
  border: 1px solid var(--bai-edge);
  background: var(--bai-surface-muted);
}
.bai-panel-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.85rem;
  border-bottom: 1px solid var(--bai-edge);
  background: color-mix(in srgb, var(--bai-surface-muted) 70%, transparent);
}
.bai-panel-title {
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--bai-accent-text);
}

.bai-panel-table {
  width: 100%;
  font-size: 0.82rem;
  border-collapse: collapse;
}
.bai-panel-table thead tr {
  background: color-mix(in srgb, var(--bai-surface-muted) 70%, transparent);
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.64rem;
  color: var(--bai-text-subtle);
}
.bai-panel-table th {
  padding: 0.5rem 0.85rem;
  text-align: left;
  font-weight: 600;
}
.bai-panel-table tbody tr {
  border-top: 1px solid var(--bai-edge);
}
.bai-panel-table tbody tr:hover {
  background: var(--bai-accent-soft);
}
.bai-panel-table td {
  padding: 0.5rem 0.85rem;
  vertical-align: top;
  color: var(--bai-text-muted);
}

.bai-panel-strong { color: var(--bai-text); font-weight: 500; }
.bai-panel-muted  { color: var(--bai-text-subtle); }
.bai-panel-link   { color: var(--bai-accent-text); text-underline-offset: 2px; }
.bai-panel-link:hover { text-decoration: underline; }
</style>
