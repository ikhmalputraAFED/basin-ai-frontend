<template>
  <div class="basin-ai-scope basin-ai-shell flex min-h-screen flex-col antialiased">
    <slot />
  </div>
</template>

<script setup lang="ts">
// Standalone shell for the Basin AI product. No sidebar, no app topbar.
// The page (`pages/basin-ai.vue`) owns its own header so it can match the
// product's visual language without inheriting the dashboard.
//
// Theming follows the rest of the app: the project's `useDarkMode` composable
// toggles a `dark` class on <html>, and the `.basin-ai-scope` token block
// below reads off that class. We avoid hard-coded hex on individual elements
// and instead reach for `var(--bai-*)` so the same markup works in both modes.
useHead({
  htmlAttrs: { class: 'basin-ai' },
})
</script>

<style>
.basin-ai-shell {
  font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  background: var(--bai-bg);
  color: var(--bai-text);
}

/* ---------------------------------------------------------------------------
 * Design tokens for the Basin AI surface. Light defaults; dark overrides
 * activate when the global `dark` class is on <html> (or any ancestor).
 *
 * We map these to our global theme.css values where possible, but maintain
 * semantic names for the shell to preserve isolation.
 * ------------------------------------------------------------------------- */
.basin-ai-scope {
  --bai-bg:               #f9fafb; /* Lighter background matching seek branding */
  --bai-bg-soft:          #f1f5f9;
  --bai-surface:          rgba(255, 255, 255, 0.95);
  --bai-surface-strong:   #ffffff;
  --bai-surface-muted:    rgba(0, 168, 155, 0.06); /* Teal soft */
  --bai-edge:             rgba(15, 23, 42, 0.08);
  --bai-edge-strong:      rgba(15, 23, 42, 0.16);

  --bai-text:             #0f172a;
  --bai-text-muted:       #475569;
  --bai-text-subtle:      #64748b;
  --bai-text-inverse:     #ffffff;

  /* Updated accents to match the brand gradients */
  --bai-accent-from:      #00A89B; /* Seek teal primary */
  --bai-accent-to:        #264399; /* Seek blue secondary */
  --bai-accent-soft:      rgba(0, 168, 155, 0.12);
  --bai-accent-soft-2:    rgba(38, 67, 153, 0.15);
  --bai-accent-text:      #00A89B;

  --bai-success:          #059669;
  --bai-warning:          #d97706;
  --bai-danger:           #dc2626;

  --bai-shadow-lg:        0 30px 80px -28px rgba(0, 168, 155, 0.25);
  --bai-shadow-md:        0 18px 40px -22px rgba(0, 168, 155, 0.20);
  --bai-shadow-sm:        0 8px 24px -16px rgba(0, 168, 155, 0.30);

  --bai-radius-lg:        1.5rem;  /* 24px */
  --bai-radius-md:        1rem;    /* 16px */
  --bai-radius-sm:        0.75rem; /* 12px */

  color-scheme: light;
}

:where(.dark) .basin-ai-scope,
.basin-ai-scope.basin-ai-scope-dark {
  --bai-bg:               #0E162B; /* Seek dark background */
  --bai-bg-soft:          #1E2839; /* Seek dark navbar 1 */
  --bai-surface:          rgba(30, 40, 57, 0.85); /* Navbar gradient start */
  --bai-surface-strong:   #25292E; /* Navbar gradient end */
  --bai-surface-muted:    rgba(0, 168, 155, 0.08);
  --bai-edge:             rgba(255, 255, 255, 0.08);
  --bai-edge-strong:      rgba(255, 255, 255, 0.16);

  --bai-text:             #f1f5f9;
  --bai-text-muted:       #cbd5e1;
  --bai-text-subtle:      #94a3b8;
  --bai-text-inverse:     #0a0b10;

  --bai-accent-soft:      rgba(0, 168, 155, 0.18);
  --bai-accent-soft-2:    rgba(38, 67, 153, 0.25);
  --bai-accent-text:      #00BBA6; /* Gradient teal */

  --bai-success:          #34d399;
  --bai-warning:          #fbbf24;
  --bai-danger:           #fb7185;

  --bai-shadow-lg:        0 30px 80px -28px rgba(0, 0, 0, 0.85);
  --bai-shadow-md:        0 18px 40px -22px rgba(0, 0, 0, 0.75);
  --bai-shadow-sm:        0 8px 24px -16px rgba(0, 0, 0, 0.70);

  color-scheme: dark;
}

/* Global gradient halo behind the chat surface — adds subtle "alive" feeling
 * without using a heavy image. Sits behind everything (`-z-10`). */
.basin-ai-shell::before {
  content: '';
  position: fixed;
  inset: -10%;
  z-index: -10;
  background:
    radial-gradient(60% 60% at 80% 0%, var(--bai-accent-soft-2) 0%, transparent 60%),
    radial-gradient(50% 50% at 0% 100%, var(--bai-accent-soft) 0%, transparent 60%);
  pointer-events: none;
  filter: blur(40px);
}
</style>
