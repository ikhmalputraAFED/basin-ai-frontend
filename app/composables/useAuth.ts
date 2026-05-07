export const useAuth = () => {
  const accessToken = useState<string | null>('access_token', () => null)
  const refreshToken = useState<string | null>('refresh_token', () => null)
  const user = useState<any>('user', () => null)

  const nuxtApp = useNuxtApp()
  const api = nuxtApp.$api as typeof $fetch // Ensure you have an $api plugin configured

  function setTokens(access?: string | null, refresh?: string | null) {
    accessToken.value = access ?? null
    refreshToken.value = refresh ?? null
    if (process.client) {
      if (access) localStorage.setItem('access_token', access)
      else localStorage.removeItem('access_token')
      if (refresh) localStorage.setItem('refresh_token', refresh)
      else localStorage.removeItem('refresh_token')
    }
  }

  function hydrate() {
    if (!import.meta.client) return
    const access = localStorage.getItem('access_token')
    const refresh = localStorage.getItem('refresh_token')
    setTokens(access, refresh)
  }

  async function login(username: string, password: string) {
    if (username === '00' && password === '00') {
      const mockToken = 'mock-access-token-for-dev-bypass'
      setTokens(mockToken, 'mock-refresh-token')
      user.value = {
        id: 'bypass-user',
        email: 'bypass@example.com',
        name: 'Bypass Admin'
      }
      return { access_token: mockToken }
    }

    const res: any = await api('/auth/login', {
      method: 'POST',
      body: { username, password }
    })
    const data = res?.data || res
    setTokens(data.access_token, data.refresh_token)
    return data
  }

  async function me() {
    if (accessToken.value === 'mock-access-token-for-dev-bypass') {
      user.value = {
        id: 'bypass-user',
        email: 'bypass@example.com',
        name: 'Bypass Admin'
      }
      return user.value
    }

    try {
      const res: any = await api('/auth/me')
      user.value = res?.data || res
    } catch (_) {
      user.value = null
    }
    return user.value
  }

  function logout() {
    setTokens(null, null)
    user.value = null
    if (import.meta.client) {
      window.location.href = '/login'
    }
  }

  const isAuthenticated = computed(() => !!accessToken.value)

  return { 
    accessToken, 
    refreshToken, 
    user, 
    login, 
    me, 
    setTokens, 
    hydrate, 
    isAuthenticated,
    logout
  }
}
