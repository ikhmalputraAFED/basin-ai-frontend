<template>
  <div class="basin-ai-md text-sm leading-relaxed" v-html="rendered" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'

/**
 * Renders an assistant message as styled HTML. We use the project's existing
 * `marked` dependency in GFM mode (tables, fenced code, autolinks) and apply
 * a small Tailwind layer in the scoped style block so the result fits the
 * Basin AI dark chat panel without polluting global typography.
 */

const props = defineProps<{
  source: string
}>()

marked.setOptions({
  gfm: true,
  breaks: true,
})

const rendered = computed(() => {
  if (!props.source) return ''
  try {
    return marked.parse(props.source) as string
  } catch {
    // Fall back to the raw text so the user always sees something.
    return props.source
  }
})
</script>

<style scoped>
/* Markdown rendering for assistant messages. All colors flow from the
 * `--bai-*` tokens defined in the basin-ai layout, so light & dark themes
 * are handled in one place. */

.basin-ai-md { color: var(--bai-text); }

.basin-ai-md :deep(p) { margin: 0 0 0.55rem; }
.basin-ai-md :deep(p:last-child) { margin-bottom: 0; }

.basin-ai-md :deep(h1),
.basin-ai-md :deep(h2),
.basin-ai-md :deep(h3),
.basin-ai-md :deep(h4) {
  font-weight: 600;
  color: var(--bai-text);
  margin: 0.85rem 0 0.45rem;
  line-height: 1.3;
  letter-spacing: -0.005em;
}
.basin-ai-md :deep(h1) { font-size: 1.1rem; }
.basin-ai-md :deep(h2) { font-size: 1.02rem; }
.basin-ai-md :deep(h3) { font-size: 0.95rem; }
.basin-ai-md :deep(h4) { font-size: 0.88rem; }

.basin-ai-md :deep(strong) { color: var(--bai-text); font-weight: 600; }
.basin-ai-md :deep(em)     { color: var(--bai-text-muted); }

.basin-ai-md :deep(a) {
  color: var(--bai-accent-text);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.basin-ai-md :deep(a:hover) { filter: brightness(1.15); }

.basin-ai-md :deep(ul),
.basin-ai-md :deep(ol) {
  margin: 0.3rem 0 0.65rem;
  padding-left: 1.2rem;
}
.basin-ai-md :deep(ul) { list-style: disc; }
.basin-ai-md :deep(ol) { list-style: decimal; }
.basin-ai-md :deep(li) { margin: 0.18rem 0; }
.basin-ai-md :deep(li > p) { margin: 0; }

.basin-ai-md :deep(blockquote) {
  border-left: 2px solid var(--bai-accent-soft-2);
  padding: 0.3rem 0.85rem;
  margin: 0.6rem 0;
  color: var(--bai-text-muted);
  background: var(--bai-accent-soft);
  border-radius: 0 0.5rem 0.5rem 0;
}

.basin-ai-md :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.82rem;
  padding: 0.12rem 0.4rem;
  border-radius: 0.4rem;
  background: var(--bai-surface-muted);
  color: var(--bai-accent-text);
  border: 1px solid var(--bai-edge);
}
.basin-ai-md :deep(pre) {
  margin: 0.6rem 0;
  padding: 0.8rem 0.95rem;
  background: var(--bai-surface-muted);
  border: 1px solid var(--bai-edge);
  border-radius: 0.85rem;
  overflow-x: auto;
}
.basin-ai-md :deep(pre code) {
  padding: 0;
  background: transparent;
  border: 0;
  font-size: 0.8rem;
  line-height: 1.55;
  color: var(--bai-text);
}

.basin-ai-md :deep(hr) {
  border: 0;
  border-top: 1px solid var(--bai-edge);
  margin: 0.85rem 0;
}

/* Tables. */
.basin-ai-md :deep(table) {
  display: block;
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
  border: 1px solid var(--bai-edge);
  border-radius: 0.85rem;
  margin: 0.7rem 0;
  font-size: 0.85rem;
}
.basin-ai-md :deep(thead) {
  background: linear-gradient(180deg, var(--bai-accent-soft-2), var(--bai-accent-soft));
}
.basin-ai-md :deep(th) {
  text-align: left;
  font-weight: 600;
  color: var(--bai-text);
  padding: 0.55rem 0.75rem;
  border-bottom: 1px solid var(--bai-edge);
  white-space: nowrap;
}
.basin-ai-md :deep(td) {
  padding: 0.5rem 0.75rem;
  border-top: 1px solid var(--bai-edge);
  color: var(--bai-text-muted);
  vertical-align: top;
}
.basin-ai-md :deep(tbody tr:nth-child(even)) {
  background: color-mix(in srgb, var(--bai-surface-muted) 50%, transparent);
}
.basin-ai-md :deep(tbody tr:hover) {
  background: var(--bai-accent-soft);
}
</style>
