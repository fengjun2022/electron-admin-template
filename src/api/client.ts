const DEFAULT_API_BASE_URL = 'http://47.101.128.4:2002/robt'
const API_BASE_URL_STORAGE_KEY = 'robot_web_api_base_url'
const AUTH_TOKEN_STORAGE_KEY = 'robot_web_auth_token'

export function getApiBaseUrl(): string {
  const fromStorage = typeof window !== 'undefined'
    ? localStorage.getItem(API_BASE_URL_STORAGE_KEY)
    : null
  const fromEnv = import.meta.env.VITE_API_BASE_URL as string | undefined
  return (fromStorage || fromEnv || DEFAULT_API_BASE_URL).replace(/\/+$/, '')
}

export function setApiBaseUrl(url: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(API_BASE_URL_STORAGE_KEY, (url || '').trim().replace(/\/+$/, ''))
}

export function getAuthToken(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || ''
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return
  if (!token) {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    return
  }
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
}

export function clearAuthToken(): void {
  setAuthToken('')
}

type RequestOptions = {
  method?: string
  body?: unknown
  auth?: boolean
  headers?: Record<string, string>
}

async function parseResponse<T>(resp: Response): Promise<T> {
  const ct = resp.headers.get('content-type') || ''
  if (!resp.ok) {
    let message = `HTTP ${resp.status}`
    try {
      if (ct.includes('application/json')) {
        const err = await resp.json() as { detail?: string; message?: string }
        message = err.detail || err.message || message
      } else {
        const text = await resp.text()
        if (text) message = text
      }
    } catch {
      // ignore parse error
    }
    throw new Error(message)
  }

  if (ct.includes('application/json')) {
    return await resp.json() as T
  }
  return await resp.text() as unknown as T
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`
  const headers: Record<string, string> = {
    ...(options.headers || {}),
  }
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (options.auth !== false) {
    const token = getAuthToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const resp = await fetch(url, {
    method: options.method || (options.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })
  return parseResponse<T>(resp)
}

export function buildApiUrl(path: string): string {
  return `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`
}
