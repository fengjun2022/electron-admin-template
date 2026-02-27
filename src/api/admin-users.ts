import { apiRequest } from './client'
import type {
  AdminUserCreateRequest,
  AdminUsersListResponse,
  AdminUserUpdateRequest,
  AdminUserUpsertResponse,
} from './types'

export function listAdminUsersApi(limit = 500) {
  return apiRequest<AdminUsersListResponse>(`/admin/users?limit=${encodeURIComponent(String(limit))}`, {
    method: 'GET',
    auth: true,
  })
}

export function createAdminUserApi(payload: AdminUserCreateRequest) {
  return apiRequest<AdminUserUpsertResponse>('/admin/users', {
    method: 'POST',
    body: payload,
    auth: true,
  })
}

export function updateAdminUserApi(userId: number, payload: AdminUserUpdateRequest) {
  return apiRequest<AdminUserUpsertResponse>(`/admin/users/${encodeURIComponent(String(userId))}`, {
    method: 'PATCH',
    body: payload,
    auth: true,
  })
}
