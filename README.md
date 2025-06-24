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
  storage: 'local' // 'local', 'session', or 'cookie'
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
  // Handle post-logout actions
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
      // Handle post-logout actions
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
| `logout()` | Logs out the user and clears tokens |
| `isAuthenticated()` | Checks if user is authenticated |
| `user()` | Fetches user profile |
| `getToken()` | Returns the current JWT token |
| `http()` | Returns the configured Axios instance |
| `tryRefreshToken()` | Attempts to refresh the token |

## License

MIT
