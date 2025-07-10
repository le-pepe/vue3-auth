# @le-pepe/vue-auth

A Vue 3 plugin for handling JWT authentication with optional refresh tokens.

## Features

- 🔒 JWT authentication with optional refresh token support
- 🔄 Automatic token refresh
- 📦 Multiple storage options (localStorage, sessionStorage, cookies)
- 🛣️ Vue Router integration with navigation guards
- 🌐 Axios integration with automatic token injection
- 👤 User profile fetching
- 🧩 TypeScript support
- 🔐 Automatic token validation on every request
- 🚪 Automatic redirect to login when token is missing or invalid
- 🔄 Automatic retry with refreshed token on 401 responses

## Installation

```bash
# npm
npm install @le-pepe/vue-auth

# yarn
yarn add @le-pepe/vue-auth

# pnpm
pnpm add @le-pepe/vue-auth
```

## Quick Start

```js
// main.js
import { createApp } from 'vue'
import { createRouter } from 'vue-router'
import { createAuth } from '@le-pepe/vue-auth'
import App from './App.vue'

const router = createRouter({
  // your router configuration
})

const app = createApp(App)

// Create and configure the auth plugin
const auth = createAuth({
  router,
  apiUrl: 'https://api.example.com',
  useRefreshToken: true,
  storage: 'local', // 'local', 'session', or 'cookie'
  loginRoute: '/login' // Route to redirect when token is missing/invalid
})

app.use(router)
app.use(auth)
app.mount('#app')
```

## Usage

### Composition API

```vue
<script setup>
import { useAuth } from '@le-pepe/vue-auth'

const auth = useAuth()

async function login() {
  try {
    await auth.login({
      email: 'user@example.com',
      password: 'password123'
    })
    // Redirect is handled automatically if router is configured
  } catch (error) {
    console.error('Login failed', error)
  }
}

async function logout() {
  await auth.logout()
  // Automatically redirects to login route
}

async function fetchUserProfile() {
  const user = await auth.user()
  console.log('User profile:', user)
}
</script>
```

### Options API

```vue
<script>
export default {
  methods: {
    async login() {
      try {
        await this.$auth.login({
          email: 'user@example.com',
          password: 'password123'
        })
        // Redirect is handled automatically if router is configured
      } catch (error) {
        console.error('Login failed', error)
      }
    },
    
    async logout() {
      await this.$auth.logout()
      // Automatically redirects to login route
    }
  }
}
</script>
```

## Protected Routes

Add meta fields to your routes to protect them:

```js
const routes = [
  {
    path: '/dashboard',
    component: Dashboard,
    meta: {
      requiresAuth: true // Requires authentication
    }
  },
  {
    path: '/login',
    component: Login,
    meta: {
      guestOnly: true // Only accessible when not authenticated
    }
  }
]
```

## Automatic Token Validation

The plugin automatically validates tokens on every HTTP request:

- ✅ **Before each request**: Checks if token exists in storage
- ✅ **On 401 responses**: Attempts to refresh token if available
- ✅ **Automatic logout**: Clears tokens and redirects to login when authentication fails
- ✅ **Route protection**: Preserves the current route to redirect back after login

```js
// Example: Making API calls - token validation is automatic
const auth = useAuth()

// This will automatically:
// 1. Check if token exists in storage
// 2. Add Authorization header
// 3. Handle 401 responses
// 4. Redirect to login if needed
const response = await auth.http().get('/api/protected-data')
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tokenKey` | `string` | `'jwt_token'` | Key used for storing the JWT token |
| `refreshTokenKey` | `string` | `'refresh_token'` | Key used for storing the refresh token |
| `login.url` | `string` | `'/api/login'` | URL for login requests |
| `login.dataKey` | `string` | `undefined` | Path to extract data from login response |
| `refreshUrl` | `string` | `'/api/refresh'` | URL for token refresh requests |
| `profile.url` | `string` | `'/api/me'` | URL for fetching user profile |
| `profile.dataKey` | `string` | `undefined` | Path to extract data from profile response |
| `router` | `Router` | `undefined` | Vue Router instance for navigation guards |
| `defaultRedirect` | `string` | `'/dashboard'` | Default redirect path after login |
| `loginRoute` | `string` | `'/login'` | Route to redirect when token is missing/invalid |
| `useRefreshToken` | `boolean` | `false` | Enable refresh token functionality |
| `axios` | `AxiosInstance` | `axios.create()` | Custom Axios instance |
| `apiUrl` | `string` | `''` | Base URL for API requests |
| `tokenPath` | `string` | `'token'` | Path to extract token from login response |
| `refreshTokenPath` | `string` | `'refresh_token'` | Path to extract refresh token from login response |
| `storage` | `'local'` \| `'session'` \| `'cookie'` | `'session'` | Storage mechanism for tokens |

## API Reference

### `createAuth(options)`

Creates and configures the auth plugin.

### `useAuth()`

Composition API hook to access auth functionality.

### Auth Methods

| Method | Description |
|--------|-------------|
| `login(credentials)` | Authenticates user with provided credentials |
| `logout()` | Logs out the user, clears tokens, and redirects to login |
| `isAuthenticated()` | Checks if user is authenticated |
| `user()` | Fetches user profile |
| `getToken()` | Returns the current JWT token |
| `http()` | Returns the configured Axios instance with automatic token handling |
| `tryRefreshToken()` | Attempts to refresh the token |
| `redirectToLogin()` | Manually redirects to login route |

## How It Works

### Token Validation Flow

1. **Request Interceptor**: Before each HTTP request
   - Checks if token exists in storage
   - Adds `Authorization: Bearer <token>` header
   - Redirects to login if no token found

2. **Response Interceptor**: After each HTTP response
   - Detects 401 Unauthorized responses
   - Attempts token refresh if refresh token is available
   - Retries original request with new token
   - Logs out and redirects to login if refresh fails

3. **Route Guards**: Before each route navigation
   - Checks authentication status for protected routes
   - Attempts token refresh if needed
   - Redirects to login or dashboard based on route meta

### Storage Options

- **localStorage**: Persistent across browser sessions
- **sessionStorage**: Cleared when browser tab is closed
- **cookies**: Server-accessible, configurable expiration

## Error Handling

The plugin handles various authentication scenarios:

```js
// Login with error handling
try {
  await auth.login(credentials)
} catch (error) {
  if (error.response?.status === 401) {
    console.log('Invalid credentials')
  } else {
    console.log('Login failed:', error.message)
  }
}

// API calls with automatic error handling
try {
  const data = await auth.http().get('/api/data')
} catch (error) {
  if (error.message === 'No token found') {
    console.log('User was redirected to login')
  }
  // Other errors handled automatically
}
```

## License

MIT
```
