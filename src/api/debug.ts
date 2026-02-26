import { apiRequest } from './client'
import type { DebugExtractRequest, DebugExtractResponse } from './types'

export function debugExtractAudioLinkApi(payload: DebugExtractRequest) {
  return apiRequest<DebugExtractResponse>('/debug/extract-audio-link', {
    method: 'POST',
    body: payload,
    auth: true,
  })
}

