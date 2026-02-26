import { apiRequest } from './client'
import type { LoginRequest, LoginResponse, MeResponse } from './types'

export function loginApi(payload: LoginRequest) {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: payload,
    auth: false,
  })
}

export function meApi() {
  return apiRequest<MeResponse>('/auth/me', {
    method: 'GET',
    auth: true,
  })
}

