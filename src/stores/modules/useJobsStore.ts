import { defineStore } from 'pinia'
import { openJobEventsWS } from '@/api/ws'
import { openJobEventsSSE } from '@/api/sse'
import { buildJobEventsUrl, buildJobEventsWsUrl, getJobApi, getJobNoteApi, getJobNoteLinkApi, createJobApi, deleteJobApi } from '@/api/jobs'
import type { JobCreateRequest, JobSnapshot, JobEvent, JobNoteLinkResponse } from '@/api/types'

type SseStatus = 'idle' | 'connecting' | 'connected' | 'disconnected'

type JobUiState = {
  snapshot: JobSnapshot | null
  logs: Array<{ ts?: string; message: string }>
  events: Array<{ type: string; data: any }>
  sseStatus: SseStatus
  noteText: string
  noteLink: JobNoteLinkResponse | null
}

type StreamClient = { close: () => void }

function ensureJobUi(map: Record<string, JobUiState>, jobId: string): JobUiState {
  if (!map[jobId]) {
    map[jobId] = {
      snapshot: null,
      logs: [],
      events: [],
      sseStatus: 'idle',
      noteText: '',
      noteLink: null,
    }
  }
  return map[jobId]
}

export const useJobsStore = defineStore('jobs', {
  state: () => ({
    jobs: {} as Record<string, JobUiState>,
    currentJobId: '' as string,
    recentJobIds: [] as string[],
    _streamMap: {} as Record<string, StreamClient>,
    _retryTimers: {} as Record<string, number>,
    _retryAttempts: {} as Record<string, number>,
    _manualClosed: {} as Record<string, boolean>,
    _preferSse: {} as Record<string, boolean>,
    creating: false,
  }),
  getters: {
    currentJobState(state): JobUiState | null {
      return state.currentJobId ? state.jobs[state.currentJobId] || null : null
    },
  },
  actions: {
    setCurrentJob(jobId: string) {
      this.currentJobId = jobId
      ensureJobUi(this.jobs, jobId)
      if (!this.recentJobIds.includes(jobId)) this.recentJobIds.unshift(jobId)
      this.recentJobIds = this.recentJobIds.slice(0, 20)
    },
    async createJob(payload: JobCreateRequest) {
      this.creating = true
      try {
        const req: JobCreateRequest = {
          browser_mode: 'playwright',
          search_limit: 12,
          search_timeout: 30,
          search_pages: 2,
          search_scroll_rounds: 2,
          topic_target_videos: 3,
          topic_max_search_rounds: 3,
          keep_intermediate_audio: false,
          playwright_headless: true,
          search_headless: true,
          ...payload,
        }
        const res = await createJobApi(req)
        this.setCurrentJob(res.job_id)
        const jobUi = ensureJobUi(this.jobs, res.job_id)
        jobUi.logs.push({ ts: res.created_at, message: `任务已创建（${res.status}）` })
        return res
      } finally {
        this.creating = false
      }
    },
    async fetchJob(jobId: string) {
      const snap = await getJobApi(jobId)
      const jobUi = ensureJobUi(this.jobs, jobId)
      jobUi.snapshot = snap
      return snap
    },
    async fetchNote(jobId: string) {
      const text = await getJobNoteApi(jobId)
      ensureJobUi(this.jobs, jobId).noteText = text
      return text
    },
    async fetchNoteLink(jobId: string) {
      const data = await getJobNoteLinkApi(jobId)
      ensureJobUi(this.jobs, jobId).noteLink = data
      return data
    },
    _isTerminalStatus(status?: string) {
      const s = String(status || '')
      return s === 'completed' || s === 'failed'
    },
    _clearRetry(jobId: string) {
      const timer = this._retryTimers[jobId]
      if (typeof timer === 'number') {
        window.clearTimeout(timer)
        delete this._retryTimers[jobId]
      }
    },
    _scheduleReconnect(jobId: string) {
      this._clearRetry(jobId)
      const jobUi = ensureJobUi(this.jobs, jobId)
      const snapStatus = String(jobUi.snapshot?.status || '')
      if (this._manualClosed[jobId] || this._isTerminalStatus(snapStatus)) return
      const attempt = (Number(this._retryAttempts[jobId] || 0) + 1)
      this._retryAttempts[jobId] = attempt
      const delayMs = Math.min(1000 * (2 ** Math.max(0, attempt - 1)), 10000)
      const t = window.setTimeout(() => {
        delete this._retryTimers[jobId]
        this.connectJobEvents(jobId)
      }, delayMs)
      this._retryTimers[jobId] = t
    },
    _applyRealtimeEvent(jobId: string, type: string, data: unknown) {
      const jobUi = ensureJobUi(this.jobs, jobId)
      jobUi.events.push({ type, data })
      if (jobUi.events.length > 1000) jobUi.events = jobUi.events.slice(-600)
      if (type === 'status') {
        const d = data as any
        if (jobUi.snapshot) {
          jobUi.snapshot = { ...jobUi.snapshot, stage: d.stage || '', detail: d.detail || '' }
        }
        const stage = String(d?.stage || '').trim()
        const detail = String(d?.detail || '').trim()
        const msg = [stage, detail].filter(Boolean).join('：')
        if (msg) {
          jobUi.logs.push({ ts: d?.ts, message: msg })
          if (jobUi.logs.length > 2000) jobUi.logs = jobUi.logs.slice(-1200)
        }
      }
      if (type === 'waiting_user_pick') {
        const d = data as any
        if (jobUi.snapshot) {
          jobUi.snapshot = {
            ...jobUi.snapshot,
            status: 'waiting_user_pick' as any,
            result: (d?.result ?? jobUi.snapshot.result) as any,
          }
        }
      }
      if (type === 'topic_selected_videos') {
        const d = data as any
        const items = Array.isArray(d?.items) ? d.items : []
        if (jobUi.snapshot) {
          const prevResult = (jobUi.snapshot.result as Record<string, unknown> | null) || {}
          jobUi.snapshot = {
            ...jobUi.snapshot,
            kind: (jobUi.snapshot.kind || 'topic') as any,
            result: {
              ...prevResult,
              selected_videos: items,
            } as any,
          }
        }
      }
      if (type === 'queue_status') {
        const d = data as any
        if (jobUi.snapshot) {
          const prevResult = (jobUi.snapshot.result as Record<string, unknown> | null) || {}
          jobUi.snapshot = {
            ...jobUi.snapshot,
            result: {
              ...prevResult,
              ...(d?.queue ? { queue_runtime: d.queue } : {}),
              ...(d?.queue_batch ? { queue_batch: d.queue_batch } : {}),
            } as any,
          }
        }
      }
      if (type === 'child_note_ready') {
        const d = data as any
        const title = String(d?.title || '候选视频')
        jobUi.logs.push({ ts: d?.ts, message: `${title} 笔记已完成，可先预览` })
        if (jobUi.logs.length > 2000) jobUi.logs = jobUi.logs.slice(-1200)
      }
      if (type === 'log') {
        const d = data as any
        jobUi.logs.push({ ts: d?.ts, message: d?.message || '' })
        if (jobUi.logs.length > 2000) jobUi.logs = jobUi.logs.slice(-1200)
      }
    },
    connectJobEvents(jobId: string) {
      const jobUi = ensureJobUi(this.jobs, jobId)
      this._manualClosed[jobId] = false
      const existing = this._streamMap[jobId]
      if (existing && (jobUi.sseStatus === 'connecting' || jobUi.sseStatus === 'connected')) {
        return
      }
      this.disconnectJobEvents(jobId, false)
      jobUi.sseStatus = 'connecting'
      const connectBySse = () => {
        const es = openJobEventsSSE(buildJobEventsUrl(jobId), {
          onOpen: () => {
            this._clearRetry(jobId)
            this._retryAttempts[jobId] = 0
            this._preferSse[jobId] = true
            jobUi.sseStatus = 'connected'
          },
          onSnapshot: (snapshot) => {
            jobUi.snapshot = snapshot
            jobUi.sseStatus = 'connected'
          },
          onEvent: (type, data) => {
            this._applyRealtimeEvent(jobId, type, data)
          },
          onCompleted: async (data) => {
            jobUi.sseStatus = 'disconnected'
            const d = data as any
            if (jobUi.snapshot) {
              jobUi.snapshot = {
                ...jobUi.snapshot,
                status: 'completed',
                stage: '任务已完成',
                detail: '任务已完成',
                result: d.result ?? jobUi.snapshot.result,
              }
            }
            jobUi.logs.push({ ts: new Date().toISOString(), message: '当前任务已完成' })
            if (jobUi.logs.length > 2000) jobUi.logs = jobUi.logs.slice(-1200)
            try {
              await this.fetchJob(jobId)
              await this.fetchNote(jobId)
              await this.fetchNoteLink(jobId)
            } catch {
              // ignore
            }
            this.disconnectJobEvents(jobId, true)
          },
          onFailed: (data) => {
            jobUi.sseStatus = 'disconnected'
            const d = data as any
            if (jobUi.snapshot) {
              jobUi.snapshot = {
                ...jobUi.snapshot,
                status: 'failed',
                stage: '任务失败',
                detail: String(d?.error || '任务执行失败'),
                error: d.error || jobUi.snapshot.error,
              }
            }
            jobUi.logs.push({ ts: new Date().toISOString(), message: `任务失败：${String(d?.error || '未知错误')}` })
            if (jobUi.logs.length > 2000) jobUi.logs = jobUi.logs.slice(-1200)
            this.disconnectJobEvents(jobId, true)
          },
          onError: () => {
            if (this._manualClosed[jobId]) return
            const snapStatus = String(jobUi.snapshot?.status || '')
            if (this._isTerminalStatus(snapStatus)) {
              jobUi.sseStatus = 'disconnected'
              return
            }
            // EventSource 会自动重连，这里仅更新 UI 状态。
            jobUi.sseStatus = 'connecting'
          },
        })
        this._streamMap[jobId] = { close: () => es.close() }
      }

      const wsUrl = buildJobEventsWsUrl(jobId)

      if (this._preferSse[jobId]) {
        connectBySse()
        return
      }

      let wsOpened = false
      let wsOpenedAt = 0
      let switchedToSse = false
      const switchToSse = () => {
        if (switchedToSse || this._manualClosed[jobId]) return
        switchedToSse = true
        this._preferSse[jobId] = true
        const cur = this._streamMap[jobId]
        if (cur) {
          try { cur.close() } catch { /* ignore */ }
          delete this._streamMap[jobId]
        }
        connectBySse()
      }

      const ws = openJobEventsWS(wsUrl, {
        onOpen: () => {
          wsOpened = true
          wsOpenedAt = Date.now()
          this._clearRetry(jobId)
          this._retryAttempts[jobId] = 0
          jobUi.sseStatus = 'connected'
        },
        onSnapshot: (snapshot) => {
          jobUi.snapshot = snapshot
          jobUi.sseStatus = 'connected'
        },
        onEvent: (type, data) => {
          this._applyRealtimeEvent(jobId, type, data)
        },
        onCompleted: async (data) => {
          jobUi.sseStatus = 'disconnected'
          const d = data as any
          if (jobUi.snapshot) {
            jobUi.snapshot = {
              ...jobUi.snapshot,
              status: 'completed',
              stage: '任务已完成',
              detail: '任务已完成',
              result: d.result ?? jobUi.snapshot.result,
            }
          }
          jobUi.logs.push({ ts: new Date().toISOString(), message: '当前任务已完成' })
          if (jobUi.logs.length > 2000) jobUi.logs = jobUi.logs.slice(-1200)
          try {
            await this.fetchJob(jobId)
            await this.fetchNote(jobId)
            await this.fetchNoteLink(jobId)
          } catch {
            // ignore
          }
          this.disconnectJobEvents(jobId, true)
        },
        onFailed: (data) => {
          jobUi.sseStatus = 'disconnected'
          const d = data as any
          if (jobUi.snapshot) {
            jobUi.snapshot = {
              ...jobUi.snapshot,
              status: 'failed',
              stage: '任务失败',
              detail: String(d?.error || '任务执行失败'),
              error: d.error || jobUi.snapshot.error,
            }
          }
          jobUi.logs.push({ ts: new Date().toISOString(), message: `任务失败：${String(d?.error || '未知错误')}` })
          if (jobUi.logs.length > 2000) jobUi.logs = jobUi.logs.slice(-1200)
          this.disconnectJobEvents(jobId, true)
        },
        onError: () => {
          if (!wsOpened) {
            switchToSse()
            return
          }
          jobUi.sseStatus = 'disconnected'
        },
        onClose: (ev) => {
          if (!wsOpened) {
            switchToSse()
            return
          }
          const snapStatus = String(jobUi.snapshot?.status || '')
          if (this._manualClosed[jobId] || this._isTerminalStatus(snapStatus)) {
            jobUi.sseStatus = 'disconnected'
            return
          }
          const closeCode = Number(ev?.code || 0)
          const lifetimeMs = wsOpenedAt > 0 ? (Date.now() - wsOpenedAt) : 0
          if (closeCode === 1000 && lifetimeMs > 0 && lifetimeMs < 3000) {
            switchToSse()
            return
          }
          jobUi.sseStatus = 'connecting'
          this._scheduleReconnect(jobId)
        },
      })
      this._streamMap[jobId] = { close: () => ws.close() }
    },
    disconnectJobEvents(jobId: string, manual = true) {
      if (manual) this._manualClosed[jobId] = true
      this._clearRetry(jobId)
      const stream = this._streamMap[jobId]
      if (stream) {
        stream.close()
        delete this._streamMap[jobId]
      }
      const jobUi = this.jobs[jobId]
      if (jobUi && (jobUi.sseStatus === 'connected' || jobUi.sseStatus === 'connecting')) jobUi.sseStatus = 'disconnected'
    },
    async deleteJob(jobId: string) {
      try {
        await deleteJobApi(jobId)
      } catch {
        // If backend doesn't have this job (or delete fails), still clean local cache.
      }
      this.disconnectJobEvents(jobId)
      delete this.jobs[jobId]
      this.recentJobIds = this.recentJobIds.filter((id) => id !== jobId)
      if (this.currentJobId === jobId) this.currentJobId = ''
      return true
    },
  },
  persist: {
    pick: ['currentJobId', 'recentJobIds'],
  },
})
