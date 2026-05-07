````markdown
# Login Page Replication Guide

This document provides the exact details and code required to replicate the SEEK login page in your new admin repository. Since this new repo will act as a central hub (including user creation), replicating the Keycloak integration and UI components perfectly is essential.

## 1. Keycloak Local Setup & Configuration

To connect the new admin page to Keycloak locally (just like the current setup), you will need to run Keycloak and configure it to match the existing environment.

### Docker Setup for Local Keycloak
You can run Keycloak locally using Docker:
```bash
docker run -p 8080:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin quay.io/keycloak/keycloak:latest start-dev
```

### Keycloak Realm & Client Configuration
1. **Realm**: The current app uses the `master` realm (or a custom realm if specified in your `.env`).
2. **Client ID**: Create a client named `seek-dev` (or your new admin client ID).
3. **Valid Redirect URIs**: Ensure you add `http://localhost:3000/auth/callback` (or your new admin port) to the valid redirect URIs.
4. **Identity Provider (Microsoft)**: To support the "Sign in with Microsoft" button, you must add Microsoft as an Identity Provider in Keycloak settings. This is what allows the `kc_idp_hint=microsoft` parameter to bypass the Keycloak login screen and go straight to Microsoft.

### Nuxt Configuration (`nuxt.config.ts`)
Add the Keycloak public configuration to your new repo's `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      keycloak: {
        url: process.env.KEYCLOAK_URL || 'http://localhost:8080',
        realm: process.env.KEYCLOAK_REALM || 'master',
        clientId: process.env.KEYCLOAK_CLIENT_ID || 'seek-dev' // Change if your admin client ID is different
      }
    }
  }
})
```

---

## 2. Authentication Composables

You will need to replicate the `useAuth` composable in your new repository (`app/composables/useAuth.ts`) to manage tokens and state exactly like the current app.

```typescript
// app/composables/useAuth.ts
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

  async function login(username: string, password: string) {
    // If you use encrypted login in the admin repo, replicate useSecureAuth(). 
    // Otherwise, point directly to your standard /auth/login endpoint.
    const res: any = await api('/auth/login', {
      method: 'POST',
      body: { username, password }
    })
    const data = res?.data || res
    setTokens(data.access_token, data.refresh_token)
    return data
  }

  async function me() {
    try {
      const res: any = await api('/auth/me')
      user.value = res?.data || res
    } catch (_) {
      user.value = null
    }
    return user.value
  }

  return { accessToken, refreshToken, user, login, me, setTokens }
}
```

---

## 3. Login Page Code (`login.vue`)

This is the exact replica of the `login.vue` template, script, and scoped styles. Create this file at `app/pages/login.vue`.

```vue
<template>
  <div class="main-login-container">
    <!-- Gradient Background -->
    <div class="absolute inset-0 seek-gradient"></div>
    
    <!-- Top Navigation Bar -->
    <div class="absolute top-0 left-0 right-0 z-10">
      <div class="navbar-gradient border border-white/20" style="height: 72px; padding: 16px 32px;">
        <div class="flex flex-row justify-center items-center w-full h-full">
          <div class="">
            <!-- Ensure you copy the seek-logo.svg to your assets folder -->
            <img src="~/assets/images/seek-logo.svg" alt="SEEK" class="w-full h-full" />
          </div>
        </div>
      </div>
    </div>

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
          <!-- Email Field -->
          <div class="space-y-2">
            <label for="email" class="block text-sm font-medium text-slate-300">
              Email
            </label>
            <input
              id="email"
              v-model="username"
              type="email"
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
      © Edafy 2024
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false
})

// Auto-redirect if already authenticated
const { user } = useAuth()
onMounted(() => {
  if (user.value) {
    // Change this to your admin dashboard route
    navigateTo('/admin') 
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

const { login, me } = useAuth()

// Standard Email/Password Login
async function onSubmit() {
  if (loading.value) return
  
  error.value = ''
  loading.value = true
  
  try {
    await login(username.value, password.value)
    await me()

    // Redirect to admin dashboard after successful login
    await navigateTo('/admin')
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

/* SEEK Gradient Background */
.seek-gradient {
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
```

## 4. Final Checklist for the New Repo
- [ ] Install **Tailwind CSS** (if not already installed).
- [ ] Replicate the `<img src="~/assets/images/seek-logo.svg" />` file into the `assets/images` directory.
- [ ] Create the `/auth/callback.vue` route to handle the Keycloak SSO redirection loop.
- [ ] Implement the `$api` fetch interceptor in your plugins to ensure requests attach the Bearer token.

---

## 5. Design Language & Color Palette

To keep the UI perfectly identical to the SEEK repo, you must carry over the custom CSS variables and Tailwind configuration. 

### Tailwind Colors & Variables (`assets/css/tailwind.css`)
Ensure your Tailwind configuration (or `tailwind.css` if using Vite `@tailwindcss/vite` plugin inline theme) includes these exact custom colors:

```css
@theme inline {
  /* SEEK Brand Colors */
  --color-seek-primary: #00A89B;
  --color-seek-secondary: #264399;
  --color-seek-purple: #6D2B8F;

  /* Button & Toggle Colors */
  --color-toggle-base: #057F75;
  --color-button-primary: #009689;
  --color-button-white: #FFFFFF;

  /* Gradients */
  --color-gradient-blue: #2B7FFF;
  --color-gradient-teal: #00BBA6;

  /* Overlay & Backgrounds */
  --color-background-dark: #0E162B;
  --color-navbar-dark-1: #1E2839;
  --color-navbar-dark-2: #25292E;
  --color-overlay-base: #314158;

  /* Brand Scale */
  --color-brand-500: #068075;
  --color-brand-600: #056b61;
  --color-brand-700: #044e46;
  --color-brand-800: #000000;

  /* Gray Scale */
  --color-gray-25: #F9FCFE;
  --color-gray-50: #F8F8F8;
  --color-gray-100: #C9D9ED;
  --color-gray-200: #ABBCD3;
  --color-gray-300: #90A1B9;
  --color-gray-400: #62748E;
  --color-gray-500: #45556C;
  --color-gray-600: #233045;
  --color-gray-700: #1D293D;
  --color-gray-750: #233045;
  --color-gray-800: #0F172B;
  --color-gray-900: #020202;
}
```

### Theme & Gradient CSS (`assets/css/theme.css`)
In your global CSS files, define the custom gradient classes that the login page uses:

```css
:root {
  --seek-gradient: linear-gradient(252.4deg, #00A89B 2.52%, #0A8D9A 23.61%, #264399 57.35%, #6D2B8F 100%);
  --navbar-gradient: linear-gradient(180deg, rgba(30, 40, 57, 0.8) 0%, #26292E 100%);
  --background-gradient: linear-gradient(135deg, var(--color-gradient-blue) 0%, var(--color-gradient-teal) 100%);
}

.seek-gradient {
  background: var(--seek-gradient);
}

.navbar-gradient {
  background: var(--navbar-gradient);
}

.background-gradient {
  background: var(--background-gradient);
}
```

---

## 6. Architecture Context

For the new repository to align seamlessly with the SEEK platform, you should follow the existing architectural conventions.

### Frontend Architecture (Nuxt 3)
- **Framework**: Nuxt 3 with TypeScript (`compatibilityDate: '2025-07-15'`).
- **Styling**: Tailwind CSS v4 with Shadcn/ui components.
- **State Management**: Vue 3 `useState` and Composables (e.g., `useAuth.ts`) for centralized logic.
- **API Communication**: A centralized `$api` fetch instance (via Nuxt plugins) with interceptors for automatically attaching the JWT auth token and handling token refresh logic.
- **Component Pattern**: Group features in `app/components/` and pages in `app/pages/`. 

### Backend Context (Go Echo API)
When connecting this admin frontend to the backend for user creation, ensure it interacts with the existing Go backend properly:
- **Framework**: Echo v4 with a modular architecture.
- **Auth Flow**: Keycloak issues the JWT, which is sent to the Go backend. The Go backend verifies the Keycloak token and checks the user's role-based access control (RBAC).
- **Modules**: The backend groups features into modules (`handler.go`, `routes.go`, `dto.go`, and repository patterns). If you need an admin user creation endpoint, it should reside in the backend's `user` module under `/api/v1/user` rather than maintaining a separate user database.

````

