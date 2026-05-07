<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-900 text-white">
    <div class="text-center">
      <svg class="mx-auto mb-4 h-8 w-8 animate-spin text-teal-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="text-lg">Completing sign in...</p>
      <p v-if="error" class="mt-4 text-sm text-red-400">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'

definePageMeta({
  layout: false
})

const route = useRoute()
const { setTokens, me } = useAuth()
const error = ref('')

onMounted(async () => {
  const code = route.query.code as string
  const state = route.query.state as string
  const savedState = sessionStorage.getItem('oauth_state')

  if (!code) {
    error.value = 'No authorization code provided.'
    setTimeout(() => navigateTo('/login'), 2000)
    return
  }

  if (state !== savedState) {
    error.value = 'Invalid state parameter.'
    setTimeout(() => navigateTo('/login'), 2000)
    return
  }

  try {
    const config = useRuntimeConfig()
    const redirectUri = `${window.location.origin}/auth/callback`
    const keycloakUrl = config.public.keycloak.url
    const realm = config.public.keycloak.realm
    const clientId = config.public.keycloak.clientId

    // Exchange code for token
    const tokenUrl = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`
    const params = new URLSearchParams()
    params.append('grant_type', 'authorization_code')
    params.append('client_id', clientId)
    params.append('redirect_uri', redirectUri)
    params.append('code', code)

    const response = await $fetch<any>(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    })

    if (response.access_token) {
      setTokens(response.access_token, response.refresh_token)
      await me()
      navigateTo('/')
    } else {
      throw new Error('Failed to retrieve access token.')
    }
  } catch (err: any) {
    console.error('SSO Callback error:', err)
    error.value = 'Authentication failed. Redirecting to login...'
    setTimeout(() => navigateTo('/login'), 2000)
  }
})
</script>
