// src/plugins/auth.ts
import { inject, type App } from 'vue'
import type { Router, RouteLocationNormalized } from 'vue-router'
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { cookieStore } from 'cookie-store'

export interface AuthOptions {
    tokenKey?: string
    refreshTokenKey?: string
    login?: {
        url?: string
        dataKey?: string
    }
    refreshUrl?: string
    profile?: {
        url?: string
        dataKey?: string
    }
    router?: Router
    defaultRedirect?: string
    useRefreshToken?: boolean
    axios?: AxiosInstance
    apiUrl?: string
    tokenPath?: string // e.g., 'token.bearer'
    refreshTokenPath?: string // e.g., 'token.refresh'
    storage?: 'local' | 'session' | 'cookie'
}

export interface LoginCredentials {
    [key: string]: any
}

export interface AuthMeta {
    requiresAuth?: boolean
    guestOnly?: boolean
    redirectTo?: string
}

let _redirectAfterLogin: string | null = null
let _auth: ReturnType<typeof createAuthInstance> | null = null

function getByPath(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc?.[part], obj)
}

function createAuthInstance(options: AuthOptions = {}) {
    const tokenKey = options.tokenKey || 'jwt_token'
    const refreshTokenKey = options.refreshTokenKey || 'refresh_token'
    const loginUrl = options.login?.url || '/api/login'
    const loginDataKey = options.login?.dataKey
    const refreshUrl = options.refreshUrl || '/api/refresh'
    const profileUrl = options.profile?.url || '/api/me'
    const profileDataKey = options.profile?.dataKey
    const router = options.router
    const defaultRedirect = options.defaultRedirect || '/dashboard'
    const useRefreshToken = options.useRefreshToken ?? false
    const storage = options.storage || 'session'
    const tokenPath = options.tokenPath || 'token'
    const refreshTokenPath = options.refreshTokenPath || 'refresh_token'

    const httpInstance = options.axios || axios.create({
        baseURL: options.apiUrl || ''
    })

    const cookieStoreAvailable = typeof window !== 'undefined' && 'cookieStore' in window

    const storageAPI = {
        async get(key: string): Promise<string | null> {
            if (storage === 'local') return localStorage.getItem(key)
            if (storage === 'cookie') {
                if (cookieStoreAvailable) {
                    const cookie = await cookieStore.get(key)
                    return cookie?.value || null
                } else {
                    return document.cookie.split('; ').find(row => row.startsWith(key + '='))?.split('=')[1] || null
                }
            }
            return sessionStorage.getItem(key)
        },
        async set(key: string, value: string) {
            if (storage === 'local') localStorage.setItem(key, value)
            else if (storage === 'cookie') {
                if (cookieStoreAvailable) {
                    //@ts-ignore
                    await cookieStore.set({
                        name: key,
                        value,
                        path: '/',
                        secure: location.protocol === 'https:',
                    })
                } else {
                    document.cookie = `${key}=${value}; Path=/; SameSite=Strict;${location.protocol === 'https:' ? ' Secure;' : ''}`
                }
            } else sessionStorage.setItem(key, value)
        },
        async remove(key: string) {
            if (storage === 'local') localStorage.removeItem(key)
            else if (storage === 'cookie') {
                if (cookieStoreAvailable) {
                    await cookieStore.delete(key)
                } else {
                    document.cookie = `${key}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict;${location.protocol === 'https:' ? ' Secure;' : ''}`
                }
            } else sessionStorage.removeItem(key)
        }
    }

    const auth = {
        token: null as string | null,
        refreshToken: null as string | null,

        isAuthenticated(): boolean {
            return !!auth.token
        },

        async setToken(token: string) {
            auth.token = token
            await storageAPI.set(tokenKey, token)
        },

        async setRefreshToken(token: string) {
            if (!useRefreshToken) return
            auth.refreshToken = token
            await storageAPI.set(refreshTokenKey, token)
        },

        async clearToken() {
            auth.token = null
            await storageAPI.remove(tokenKey)
        },

        async clearRefreshToken() {
            if (!useRefreshToken) return
            auth.refreshToken = null
            await storageAPI.remove(refreshTokenKey)
        },

        getToken(): string | null {
            return auth.token
        },

        http() {
            return httpInstance
        },

        async login(credentials: LoginCredentials) {
            const res = await httpInstance.post(loginUrl, credentials)
            const payload = loginDataKey ? getByPath(res.data, loginDataKey) : res.data

            const jwt = getByPath(payload, tokenPath)
            if (jwt) {
                await auth.setToken(jwt)
            }

            if (useRefreshToken) {
                const refresh = getByPath(payload, refreshTokenPath)
                if (refresh) {
                    await auth.setRefreshToken(refresh)
                }
            }

            if (router) {
                const target = _redirectAfterLogin || defaultRedirect
                _redirectAfterLogin = null
                router.push(target)
            }

            return res.data
        },

        async logout() {
            await auth.clearToken()
            await auth.clearRefreshToken()
        },

        async tryRefreshToken() {
            if (!useRefreshToken || !auth.refreshToken) return false

            try {
                const res = await httpInstance.post(refreshUrl, {
                    refresh_token: auth.refreshToken
                })
                const newToken = getByPath(res.data, tokenPath)
                if (newToken) {
                    await auth.setToken(newToken)
                    return true
                }
            } catch (err) {
                await auth.logout()
            }
            return false
        },

        async user() {
            if (!auth.token) return null
            try {
                const res = await httpInstance.get(profileUrl)
                return profileDataKey ? getByPath(res.data, profileDataKey) : res.data
            } catch (err) {
                return null
            }
        }
    }

    // Interceptor para inyectar token dinámicamente
    httpInstance.interceptors.request.use(config => {
        const token = auth.getToken()
        if (token) {
            config.headers = config.headers || {}
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    })

    Promise.all([
        storageAPI.get(tokenKey).then(value => auth.token = value),
        useRefreshToken ? storageAPI.get(refreshTokenKey).then(value => auth.refreshToken = value) : Promise.resolve()
    ])

    return auth
}

export function createAuth(options: AuthOptions = {}) {
    const auth = createAuthInstance(options)
    _auth = auth

    return {
        install(app: App) {
            app.config.globalProperties.$auth = auth
            app.provide('auth', auth)

            if (options.router) {
                options.router.beforeEach(async (to: RouteLocationNormalized, _from, next) => {
                    const meta = to.meta as AuthMeta
                    const requiresAuth = meta.requiresAuth
                    const guestOnly = meta.guestOnly
                    const redirectTo = meta.redirectTo || options.defaultRedirect || '/dashboard'

                    if (requiresAuth && !auth.isAuthenticated()) {
                        const refreshed = await auth.tryRefreshToken()
                        if (!refreshed) {
                            _redirectAfterLogin = to.fullPath
                            return next({ path: redirectTo })
                        }
                    }

                    if (guestOnly && auth.isAuthenticated()) {
                        return next({ path: redirectTo })
                    }

                    next()
                })
            }
        }
    }
}

export function useAuth() {
    return inject<typeof _auth>('auth')
}
