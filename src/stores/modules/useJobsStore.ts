import { defineStore } from 'pinia'
import { openJobEventsSSE } from '@/api/sse'
import { buildJobEventsUrl, getJobApi, getJobNoteApi, getJobNoteLinkApi, createJobApi, deleteJobApi } from '@/api/jobs'
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
    _sseMap: {} as Record<string, EventSource>,
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
    connectJobEvents(jobId: string) {
      const jobUi = ensureJobUi(this.jobs, jobId)
      const existing = this._sseMap[jobId]
      if (existing && (jobUi.sseStatus === 'connecting' || jobUi.sseStatus === 'connected')) {
        return
      }
      this.disconnectJobEvents(jobId)
      jobUi.sseStatus = 'connecting'
      const url = buildJobEventsUrl(jobId)
      const es = openJobEventsSSE(url, {
        onOpen: () => {
          // 连接建立成功即切换“已连接”，不依赖首条 snapshot 到达。
          jobUi.sseStatus = 'connected'
        },
        onSnapshot: (snapshot) => {
          jobUi.snapshot = snapshot
          jobUi.sseStatus = 'connected'
        },
        onEvent: (type, data) => {
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
            jobUi.logs.push({ ts: d.ts, message: d.message || '' })
            if (jobUi.logs.length > 2000) jobUi.logs = jobUi.logs.slice(-1200)
          }
        },
        onCompleted: async (data) => {
          jobUi.sseStatus = 'disconnected'
          const d = data as any
          if (jobUi.snapshot) {
            jobUi.snapshot = { ...jobUi.snapshot, status: 'completed', result: d.result ?? jobUi.snapshot.result }
          }
          try {
            await this.fetchJob(jobId)
            await this.fetchNote(jobId)
            await this.fetchNoteLink(jobId)
          } catch {
            // ignore
          }
          this.disconnectJobEvents(jobId)
        },
        onFailed: (data) => {
          jobUi.sseStatus = 'disconnected'
          const d = data as any
          if (jobUi.snapshot) {
            jobUi.snapshot = { ...jobUi.snapshot, status: 'failed', error: d.error || jobUi.snapshot.error }
          }
          this.disconnectJobEvents(jobId)
        },
        onError: () => {
          jobUi.sseStatus = 'disconnected'
        },
      })
      this._sseMap[jobId] = es
    },
    disconnectJobEvents(jobId: string) {
      const es = this._sseMap[jobId]
      if (es) {
        es.close()
        delete this._sseMap[jobId]
      }
      const jobUi = this.jobs[jobId]
      if (jobUi && jobUi.sseStatus === 'connected') jobUi.sseStatus = 'disconnected'
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
