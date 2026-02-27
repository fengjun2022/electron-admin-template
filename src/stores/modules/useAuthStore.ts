import { defineStore } from 'pinia'
import { clearAuthToken, getApiBaseUrl, getAuthToken, setApiBaseUrl, setAuthToken } from '@/api/client'
import { loginApi, meApi, registerApi } from '@/api/auth'
import type { AuthUserProfile, LoginResponse, MeResponse, PromptSettings } from '@/api/types'

type AuthUser = AuthUserProfile

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: getAuthToken(),
    apiBaseUrl: getApiBaseUrl(),
    user: null as AuthUser | null,
    promptSettings: null as PromptSettings | null,
    loading: false,
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.token),
  },
  actions: {
    setApiBaseUrlValue(url: string) {
      this.apiBaseUrl = (url || '').trim()
      setApiBaseUrl(this.apiBaseUrl)
    },
    async login(username: string, password: string) {
      this.loading = true
      try {
        const res = await loginApi({ username, password })
        this.applyLoginResponse(res)
        return res
      } finally {
        this.loading = false
      }
    },
    async register(username: string, password: string, displayName = '') {
      this.loading = true
      try {
        const res = await registerApi({ username, password, display_name: displayName })
        this.applyLoginResponse(res)
        return res
      } finally {
        this.loading = false
      }
    },
    applyLoginResponse(res: LoginResponse) {
      this.token = res.token
      setAuthToken(res.token)
      this.user = res.user
      this.promptSettings = res.prompt_settings
    },
    async fetchMe() {
      const res = await meApi()
      this.applyMeResponse(res)
      return res
    },
    applyMeResponse(res: MeResponse) {
      this.user = res.user
      this.promptSettings = res.prompt_settings
    },
    logout() {
      this.token = ''
      this.user = null
      this.promptSettings = null
      clearAuthToken()
    },
  },
  persist: {
    pick: ['token', 'user', 'promptSettings', 'apiBaseUrl'],
  },
})
