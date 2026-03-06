import { apiRequest, buildApiUrl, getAuthToken } from './client'
import type {
  ChatSelectCandidateVideoRequest,
  ChatSelectCandidateVideoResponse,
  ChatSelectCandidateVideosBatchRequest,
  ChatSelectCandidateVideosBatchResponse,
  ChatMessagesResponse,
  ChatModelsResponse,
  ChatJobNoteMessageRequest,
  ChatJobNoteMessageResponse,
  ChatImageDeleteResponse,
  ChatImageUploadResponse,
  ChatReplyRequest,
  ChatReplyResponse,
  ChatSessionsResponse,
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

export function listChatSessionsApi(limit = 50) {
  return apiRequest<ChatSessionsResponse>(`/chat/sessions?limit=${limit}`, {
    method: 'GET',
    auth: true,
  })
}

export function deleteChatSessionApi(sessionUuid: string) {
  return apiRequest<{ ok: boolean; session_uuid: string }>(`/chat/sessions/${sessionUuid}`, {
    method: 'DELETE',
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

export function selectChatCandidateVideoApi(
  sessionUuid: string,
  jobId: string,
  payload: ChatSelectCandidateVideoRequest,
) {
  return apiRequest<ChatSelectCandidateVideoResponse>(`/chat/sessions/${sessionUuid}/jobs/${jobId}/select-video`, {
    method: 'POST',
    body: payload,
    auth: true,
  })
}

export function selectChatCandidateVideosBatchApi(
  sessionUuid: string,
  jobId: string,
  payload: ChatSelectCandidateVideosBatchRequest,
) {
  return apiRequest<ChatSelectCandidateVideosBatchResponse>(`/chat/sessions/${sessionUuid}/jobs/${jobId}/select-videos-batch`, {
    method: 'POST',
    body: payload,
    auth: true,
  })
}

export function saveChatJobNoteMessageApi(
  sessionUuid: string,
  jobId: string,
  payload: ChatJobNoteMessageRequest,
) {
  return apiRequest<ChatJobNoteMessageResponse>(`/chat/sessions/${sessionUuid}/jobs/${jobId}/note-message`, {
    method: 'POST',
    body: payload,
    auth: true,
  })
}

export async function uploadChatImageApi(
  file: File,
  options: { onProgress?: (percent: number) => void } = {},
) {
  const url = buildApiUrl('/chat/uploads/image')
  const form = new FormData()
  form.append('file', file)
  const headers: Record<string, string> = {}
  const token = getAuthToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  return await new Promise<ChatImageUploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url, true)
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value)
    })
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)))
      options.onProgress?.(percent)
    }
    xhr.onerror = () => {
      reject(new Error('上传图片失败，网络异常'))
    }
    xhr.onload = () => {
      const status = Number(xhr.status || 0)
      const text = String(xhr.responseText || '')
      if (status < 200 || status >= 300) {
        let err = `HTTP ${status}`
        try {
          const data = JSON.parse(text) as any
          err = data?.detail || data?.message || err
        } catch {
          if (text.trim()) err = text.trim()
        }
        reject(new Error(err))
        return
      }
      try {
        resolve(JSON.parse(text) as ChatImageUploadResponse)
      } catch {
        reject(new Error('上传图片失败，响应解析异常'))
      }
    }
    xhr.send(form)
  })
}

export function deleteChatImageApi(bucket: string, objectName: string) {
  const q = new URLSearchParams({
    bucket: String(bucket || ''),
    object_name: String(objectName || ''),
  })
  return apiRequest<ChatImageDeleteResponse>(`/chat/uploads/image?${q.toString()}`, {
    method: 'DELETE',
    auth: true,
  })
}

type StreamHandlers = {
  onMeta?: (data: any) => void
  onStart?: (data: any) => void
  onDelta?: (text: string, data: any) => void
  onDone?: (data: any) => void
  onSaved?: (data: any) => void
  onSearchLog?: (data: any) => void
  onSearchResult?: (data: any) => void
  onSearchStatus?: (data: any) => void
  onSearchFocus?: (data: any) => void
  onUnknownEvent?: (eventName: string, data: any) => void
}

export function listActiveSearchTasksApi(limit = 50) {
  return apiRequest<{ ok: boolean; items: any[] }>(`/search/tasks/active?limit=${limit}`, {
    method: 'GET',
    auth: true,
  })
}

export async function sendChatMessageStreamApi(
  sessionUuid: string,
  payload: ChatReplyRequest,
  handlers: StreamHandlers = {},
) {
  const url = buildApiUrl(`/chat/sessions/${sessionUuid}/reply-stream`)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  }
  const token = getAuthToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
  if (!resp.ok) {
    let message = `HTTP ${resp.status}`
    try {
      const ct = resp.headers.get('content-type') || ''
      if (ct.includes('application/json')) {
        const data = await resp.json() as any
        message = data?.detail || data?.message || message
      } else {
        const text = await resp.text()
        if (text) message = text
      }
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  if (!resp.body) throw new Error('流式响应不可用')
  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const dispatchEvent = (eventName: string, rawData: string) => {
    let data: any = {}
    try {
      data = rawData ? JSON.parse(rawData) : {}
    } catch {
      data = { raw: rawData }
    }
    if (eventName === 'meta') handlers.onMeta?.(data)
    else if (eventName === 'start') handlers.onStart?.(data)
    else if (eventName === 'delta') handlers.onDelta?.(String(data?.text || ''), data)
    else if (eventName === 'done') handlers.onDone?.(data)
    else if (eventName === 'saved') handlers.onSaved?.(data)
    else if (eventName === 'search_log') handlers.onSearchLog?.(data)
    else if (eventName === 'search_result') handlers.onSearchResult?.(data)
    else if (eventName === 'search_status') handlers.onSearchStatus?.(data)
    else if (eventName === 'search_focus') handlers.onSearchFocus?.(data)
    else handlers.onUnknownEvent?.(eventName, data)
  }

  const flushBlocks = (final = false) => {
    const normalized = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const parts = normalized.split('\n\n')
    if (!final) {
      buffer = parts.pop() || ''
    } else {
      buffer = ''
    }

    for (const block of parts) {
      if (!block.trim()) continue
      const lines = block.split('\n')
      let eventName = 'message'
      const dataLines: string[] = []
      for (const line of lines) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim()
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart())
      }
      if (dataLines.length) dispatchEvent(eventName, dataLines.join('\n'))
    }
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) {
      if (buffer.trim()) flushBlocks(true)
      break
    }
    buffer += decoder.decode(value, { stream: true })
    flushBlocks(false)
  }
}
