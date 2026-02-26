import { apiRequest } from './client'
import type {
  ChatMessagesResponse,
  ChatModelsResponse,
  ChatReplyRequest,
  ChatReplyResponse,
  ChatSessionCreateResponse,
} from './types'

export function createChatSessionApi(title = '') {
  return apiRequest<ChatSessionCreateResponse>('/chat/sessions', {
    method: 'POST',
    body: { title },
    auth: true,
  })
}

export function listChatModelsApi() {
  return apiRequest<ChatModelsResponse>('/chat/models', {
    method: 'GET',
    auth: true,
  })
}

export function listChatMessagesApi(sessionUuid: string, limit = 100) {
  return apiRequest<ChatMessagesResponse>(`/chat/sessions/${sessionUuid}/messages?limit=${limit}`, {
    method: 'GET',
    auth: true,
  })
}

export function sendChatMessageApi(sessionUuid: string, payload: ChatReplyRequest) {
  return apiRequest<ChatReplyResponse>(`/chat/sessions/${sessionUuid}/messages`, {
    method: 'POST',
    body: payload,
    auth: true,
  })
}
