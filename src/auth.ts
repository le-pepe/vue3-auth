// src/plugins/auth.ts
import { inject, type App } from 'vue'
import type { Router, RouteLocationNormalized } from 'vue-router'
import axios, { AxiosInstance } from 'axios'

export interface AuthOptions {
    tokenKey?: string
    refreshTokenKey?: string
    loginUrl?: string
    refreshUrl?: string
    router?: Router
    defaultRedirect?: string
    useRefreshToken?: boolean
    axios?: AxiosInstance
    apiUrl?: string
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

function createAuthInstance(options: AuthOptions = {}) {
    const tokenKey = options.tokenKey || 'jwt_token'
    const refreshTokenKey = options.refreshTokenKey || 'refresh_token'
    const loginUrl = options.loginUrl || '/api/login'
    const refreshUrl = options.refreshUrl || '/api/refresh'
    const router = options.router
    const defaultRedirect = options.defaultRedirect || '/dashboard'
    const useRefreshToken = options.useRefreshToken ?? false

    const http = options.axios || axios.create({
        baseURL: options.apiUrl || ''
    })

    const auth = {
        token: localStorage.getItem(tokenKey),
        refreshToken: useRefreshToken ? localStorage.getItem(refreshTokenKey) : null,

        isAuthenticated(): boolean {
            return !!auth.token
        },

        setToken(token: string) {
            auth.token = token
            localStorage.setItem(tokenKey, token)
        },

        setRefreshToken(token: string) {
            if (!useRefreshToken) return
            auth.refreshToken = token
            localStorage.setItem(refreshTokenKey, token)
        },

        clearToken() {
            auth.token = null
            localStorage.removeItem(tokenKey)
        },

        clearRefreshToken() {
            if (!useRefreshToken) return
            auth.refreshToken = null
            localStorage.removeItem(refreshTokenKey)
        },

        getToken(): string | null {
            return auth.token
        },

        http(): AxiosInstance {
            return http
        },

        async login(credentials: LoginCredentials) {
            const res = await http.post(loginUrl, credentials)

            if (res.data.token) {
                auth.setToken(res.data.token)
            }

            if (useRefreshToken && res.data.refresh_token) {
                auth.setRefreshToken(res.data.refresh_token)
            }

            if (router) {
                const target = _redirectAfterLogin || defaultRedirect
                _redirectAfterLogin = null
                router.push(target)
            }

            return res.data
        },

        logout() {
            auth.clearToken()
            auth.clearRefreshToken()
        },

        async tryRefreshToken() {
            if (!useRefreshToken || !auth.refreshToken) return false

            try {
                const res = await http.post(refreshUrl, {
                    refresh_token: auth.refreshToken
                })
                if (res.data.token) {
                    auth.setToken(res.data.token)
                    return true
                }
            } catch (err) {
                auth.logout()
            }
            return false
        }
    }

    // Interceptor para agregar JWT en headers automáticamente
    http.interceptors.request.use(config => {
        if (auth.token) {
            config.headers = config.headers || {}
            config.headers.Authorization = `Bearer ${auth.token}`
        }
        return config
    })

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
