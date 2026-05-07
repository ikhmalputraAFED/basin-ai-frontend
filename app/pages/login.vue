<template>
  <div class="main-login-container">
    <!-- Gradient Background -->
    <div class="absolute inset-0 brand-gradient"></div>

    <!-- Login Card -->
    <div class="relative z-10 w-full max-w-md mx-4">
      <div class="bg-slate-800/95 backdrop-blur-sm rounded-lg shadow-2xl p-8 border border-slate-700">
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-2xl font-semibold text-white mb-2">
            Log in to your account
          </h1>
          <p class="text-slate-400 text-sm">
            Welcome back! Please provide your login information to access your account.
          </p>
        </div>

        <!-- Login Form -->
        <form @submit.prevent="onSubmit" class="space-y-6">
          <!-- Email/Username Field -->
          <div class="space-y-2">
            <label for="email" class="block text-sm font-medium text-slate-300">
              Email or Username
            </label>
            <input
              id="email"
              v-model="username"
              type="text"
              placeholder="Enter your email"
              class="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
              required
            />
          </div>

          <!-- Password Field -->
          <div class="space-y-2">
            <label for="password" class="block text-sm font-medium text-slate-300">
              Password
            </label>
            <div class="relative">
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Enter your password"
                class="w-full pr-10 px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
                required
              />

              <!-- Eye toggle -->
              <button
                type="button"
                @click="toggleShowPassword"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                class="no-hover absolute inset-y-0 right-2 flex items-center px-2 text-slate-300 hover:text-white focus:outline-none"
              >
                <!-- Eye (show) -->
                <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>

                <!-- Eye Off (hide) -->
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Remember Me & Forgot Password -->
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <input
                id="remember"
                v-model="rememberMe"
                type="checkbox"
                class="w-4 h-4 text-teal-600 bg-slate-700 border-slate-600 rounded focus:ring-teal-500 focus:ring-2"
              />
              <label for="remember" class="ml-2 text-sm text-slate-300">
                Remember for 30 days
              </label>
            </div>
            <NuxtLink
              to="/forgot-password"
              class="text-sm text-teal-400 hover:text-teal-300 transition-colors duration-200"
            >
              Forgot password?
            </NuxtLink>
          </div>

          <!-- Error Message -->
          <div v-if="error" class="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-md p-3">
            {{ error }}
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="loading"
            class="w-full py-3 px-4 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-medium rounded-md hover:from-teal-500 hover:to-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading" class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            </span>
            <span v-else>Sign In</span>
          </button>
        </form>

        <!-- Or Divider -->
        <div class="my-6">
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-slate-600"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-slate-800 text-slate-400">Or continue with</span>
            </div>
          </div>
        </div>

        <!-- Microsoft Login Button -->
        <button
          type="button"
          @click="loginWithMicrosoft"
          :disabled="microsoftLoading"
          class="w-full py-3 px-4 bg-white hover:bg-gray-50 border border-gray-300 rounded-md shadow-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="microsoftLoading" class="flex items-center justify-center">
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Connecting to Microsoft...
          </span>
          <span v-else class="flex items-center justify-center">
            <svg class="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" fill="#00BCF2"/>
            </svg>
            Sign in with Microsoft
          </span>
        </button>

        <!-- Register Link -->
        <div class="mt-6 text-center">
          <p class="text-slate-400 text-sm">
            Don't have an account?
            <NuxtLink
              to="/register"
              class="text-teal-400 hover:text-teal-300 font-medium transition-colors duration-200"
            >
              Sign up
            </NuxtLink>
          </p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="absolute bottom-4 left-4 text-slate-400 text-xs">
      © Basin AI
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'

definePageMeta({
  layout: false
})

// Auto-redirect if already authenticated
const { user, login, me } = useAuth()
onMounted(() => {
  if (user.value) {
    // Change this to your admin dashboard route
    navigateTo('/') 
  }
})

// Reactive variables
const username = ref('')
const password = ref('')
const rememberMe = ref(false)
const error = ref('')
const loading = ref(false)
const microsoftLoading = ref(false)
const showPassword = ref(false)

function toggleShowPassword() {
  showPassword.value = !showPassword.value
}

// Standard Email/Password Login
async function onSubmit() {
  if (loading.value) return
  
  error.value = ''
  loading.value = true
  
  try {
    await login(username.value, password.value)
    await me()

    // Redirect to admin dashboard after successful login
    await navigateTo('/')
  } catch (e: any) {
    console.error('Login error:', e)
    error.value = e.data?.error || e.data?.message || 'Invalid email or password. Please try again.'
  } finally {
    loading.value = false
  }
}

// Keycloak SSO Login (Microsoft)
async function loginWithMicrosoft() {
  if (microsoftLoading.value) return
  
  error.value = ''
  microsoftLoading.value = true
  
  try {
    const baseUrl = window.location.origin
    const redirectUri = `${baseUrl}/auth/callback` // Ensure you have an auth/callback route in the new repo
    
    const config = useRuntimeConfig()
    const keycloakUrl = config.public.keycloak.url
    const realm = config.public.keycloak.realm
    const clientId = config.public.keycloak.clientId
    
    const authUrl = new URL(`${keycloakUrl}/realms/${realm}/protocol/openid-connect/auth`)
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'openid profile email')
    authUrl.searchParams.set('kc_idp_hint', 'microsoft') // Triggers the Microsoft bypass in Keycloak
    
    const state = crypto.randomUUID()
    authUrl.searchParams.set('state', state)
    sessionStorage.setItem('oauth_state', state)
    
    window.location.href = authUrl.toString()
  } catch (e: any) {
    console.error('Microsoft login error:', e)
    error.value = 'Failed to initiate Microsoft login. Please try again.'
    microsoftLoading.value = false
  }
}

onMounted(() => {
  const emailInput = document.getElementById('email')
  if (emailInput) emailInput.focus()
})
</script>

<style scoped>
/* Main Login Container */
.main-login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0px;
  isolation: isolate;
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow-y: scroll;
  justify-content: center;
}

/* Brand Gradient Background */
.brand-gradient {
  background: linear-gradient(252.4deg, #00A89B 2.52%, #0A8D9A 23.61%, #264399 57.35%, #6D2B8F 100%);
}

/* NavBar Gradient */
.navbar-gradient {
  background: linear-gradient(180deg, rgba(30, 40, 57, 0.8) 0%, #26292E 100%);
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
}

/* Custom scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: rgba(51, 65, 85, 0.5); }
::-webkit-scrollbar-thumb {
  background: rgba(20, 184, 166, 0.5);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover { background: rgba(20, 184, 166, 0.7); }

/* Input & Button effects */
input:focus {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(20, 184, 166, 0.15);
}
.no-hover:hover, .no-hover:focus {
  transform: none !important;
  box-shadow: none !important;
}
button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(20, 184, 166, 0.25);
}

/* Card entrance animation */
.relative.z-10 {
  animation: slideUp 0.6s ease-out;
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

@supports not (backdrop-filter: blur(12px)) {
  .backdrop-blur-sm { background-color: rgba(30, 41, 59, 0.9); }
}
</style>
