<template>
  <div class="flex min-h-screen items-center justify-center text-sm text-slate-400">
    Signing you in…
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'

definePageMeta({ layout: false })

const { loadFromHandoff } = useAuth()

onMounted(async () => {
  // Parse the fragment ourselves — `useRoute().hash` returns the whole
  // string after "#" verbatim, not as URLSearchParams.
  const raw = window.location.hash.replace(/^#/, '')
  const params = new URLSearchParams(raw)
  const access = params.get('access_token')
  const refresh = params.get('refresh_token')
  const expRaw = params.get('expires_at')
  const returnTo = params.get('return_to') || '/'

  if (!access || !refresh) {
    // No fragment — land on /login so the user sees Basin UX before Seek.
    await navigateTo('/login', { replace: true })
    return
  }

  loadFromHandoff({
    access_token: access,
    refresh_token: refresh,
    expires_at: expRaw ? Number(expRaw) : undefined,
  })

  // Strip the fragment so a back-button press or URL copy never re-exposes
  // the tokens (SPEC §4.3 — fixed path, no hash).
  history.replaceState(null, '', '/auth/handoff')
  await navigateTo(returnTo, { replace: true })
})
</script>
