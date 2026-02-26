import { apiRequest } from './client'
import type {
  PromptAIGenerateRequest,
  PromptAIGenerateResponse,
  PromptCurrentResponse,
  PromptUpdateRequest,
} from './types'

export function getCurrentMdPromptApi() {
  return apiRequest<PromptCurrentResponse>('/prompts/md-format/current', {
    method: 'GET',
    auth: true,
  })
}

export function updateCurrentMdPromptApi(payload: PromptUpdateRequest) {
  return apiRequest<{ ok: boolean; prompt_settings: any }>('/prompts/md-format/current', {
    method: 'PUT',
    body: payload,
    auth: true,
  })
}

export function generateMdPromptByAiApi(payload: PromptAIGenerateRequest) {
  return apiRequest<PromptAIGenerateResponse>('/prompts/md-format/ai-generate', {
    method: 'POST',
    body: payload,
    auth: true,
  })
}

