import { useAuth } from '~/composables/useAuth'

export default defineNuxtRouteMiddleware((to) => {
  // The handoff route must be reachable without a session — that's where
  // the session is created from the URL fragment.
  if (to.path === '/auth/handoff') return

  const config = useRuntimeConfig()
  const { isAuthenticated, hydrate, user } = useAuth()

  // First navigation after a hard reload: rehydrate from sessionStorage.
  if (import.meta.client) hydrate()

  // Cold start / bookmark: show Basin-branded /login (SETUP_AND_ARCHITECTURE §2.4).
  if (to.path === '/login') {
    if (isAuthenticated.value) return navigateTo('/')
    return
  }

  // Phase 1 dev-only bypass: ship a synthetic identity so the chat works
  // before Seek hand-off is wired. Active only in dev builds AND when the
  // env flag is on. Never trips in production bundles.
  if (import.meta.dev && config.public.authBypass) {
    if (!user.value) {
      user.value = {
        id: config.public.devUserId || 'dev-user',
        email: config.public.devUsername || 'dev@basin-ai.local',
      }
    }
    return
  }

  if (!isAuthenticated.value) {
    return navigateTo('/login')
  }
})
