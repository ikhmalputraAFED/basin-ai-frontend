import { useAuth } from '~/composables/useAuth'

/**
 * Provides `$api` — a `$fetch` instance preconfigured for the backend
 * with automatic Bearer-token injection.
 */
export default defineNuxtPlugin(() => {
  const auth = useAuth()
  const config = useRuntimeConfig()

  const api = $fetch.create({
    baseURL: config.public.seekApiBase as string,

    onRequest: async ({ options }) => {
      const token = auth.accessToken.value
      if (token) {
        const headers = new Headers(options.headers as HeadersInit | undefined)
        headers.set('Authorization', `Bearer ${token}`)
        options.headers = headers
      }
    },

    onResponseError: async ({ response }) => {
      // If unauthorized, log out
      if (response?.status === 401) {
        auth.logout()
      }
    },
  })

  return { provide: { api } }
})
