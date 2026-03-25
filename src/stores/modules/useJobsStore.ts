import { defineStore } from 'pinia'
import { openJobEventsWS } from '@/api/ws'
import { buildJobEventsWsUrl, getJobApi, getJobNoteApi, getJobNoteLinkApi, createJobApi, deleteJobApi } from '@/api/jobs'
import type { AgentWorkflow, JobCreateRequest, JobSnapshot, JobEvent, JobNoteLinkResponse } from '@/api/types'

type SseStatus = 'idle' | 'connecting' | 'connected' | 'disconnected'

type JobUiState = {
  snapshot: JobSnapshot | null
  agentWorkflow: AgentWorkflow | null
  logs: Array<{ ts?: string; message: string }>
  events: Array<{ type: string; data: any }>
  sseStatus: SseStatus
  noteText: string
  noteLink: JobNoteLinkResponse | null
}

type StreamClient = { close: () => void }

const STATUS_LABEL_MAP: Record<string, string> = {
  waiting_user_pick: '等待选择视频',
  queued: '排队中',
  running: '运行中',
  completed: '已完成',
  failed: '失败',
}

const STAGE_LABEL_MAP: Record<string, string> = {
  init: '初始化任务',
  waiting_user_pick: '等待你选择要总结的视频',
  queue_waiting: '已加入队列，等待处理',
  queue_waiting_children: '已加入队列，等待逐个处理视频',
  run_selected_video_pipelines: '正在处理你选择的视频',
  merge_multi_notes: '正在合并多份笔记',
  search_candidates: '正在搜索候选视频',
  ai_select_video: 'AI 正在筛选候选视频',
  extract_audio_url: '正在准备音频素材',
  download_audio: '正在准备音频素材',
  convert_mp3: '正在转换音频格式',
  demucs: '正在分离人声',
  transcribe: '正在语音转文字',
  generate_note: 'AI 正在生成笔记',
  cleanup: '正在清理中间文件',
  done: '任务已完成',
  completed: '任务已完成',
}

function statusLabel(status?: string) {
  const s = String(status || '').trim().toLowerCase()
  if (!s) return '未开始'
  return STATUS_LABEL_MAP[s] || '处理中'
}

function humanizeStage(stage?: string) {
  const s = String(stage || '').trim()
  if (!s) return ''
  if (STAGE_LABEL_MAP[s]) return STAGE_LABEL_MAP[s]
  const roundMatch = s.match(/^search_round_(\d+)$/i)
  if (roundMatch?.[1]) return `AI 正在进行第 ${roundMatch[1]} 轮检索`
  if (/^(init|queued|running|completed|failed|waiting_user_pick)$/i.test(s)) {
    return statusLabel(s)
  }
  return s.replace(/_/g, ' ')
}

function humanizeDetail(detail?: string, stage?: string) {
  let d = String(detail || '').trim()
  if (!d) return ''
  d = d
    .replace(/\bwaiting_user_pick\b/gi, '等待选择视频')
    .replace(/\bqueue_waiting_children\b/gi, '已入队等待逐个处理')
    .replace(/\bqueue_waiting\b/gi, '队列等待中')
    .replace(/\brun_selected_video_pipelines\b/gi, '处理已选视频')
    .replace(/\bmerge_multi_notes\b/gi, '合并多份笔记')
    .replace(/\bsearch_candidates\b/gi, '搜索候选视频')
    .replace(/\bai_select_video\b/gi, '筛选候选视频')
    .replace(/\binit\b/gi, '初始化')
    .replace(/\bqueued\b/gi, '排队中')
    .replace(/\brunning\b/gi, '运行中')
    .replace(/\bcompleted\b/gi, '已完成')
    .replace(/\bfailed\b/gi, '失败')
  if (/^search_round_\d+[:：]/i.test(d)) d = d.replace(/^search_round_(\d+)[:：]\s*/i, '第 $1 轮检索：')
  if (/^(waiting_user_pick|init)\s*[|：:]/i.test(String(detail || ''))) {
    const stageText = humanizeStage(stage) || '当前步骤'
    d = d.replace(/^(waiting_user_pick|init)\s*[|：:]\s*/i, `${stageText}：`)
  }
  return d
}

function humanizeLogMessage(text?: string) {
  const t = String(text || '').trim()
  if (!t) return ''
  const low = t.toLowerCase()
  if (/^run:/i.test(t)) return '正在执行处理步骤'
  if (/开始下载|下载视频中|下载音频|下载视频|download/i.test(t)) return '正在准备媒体素材'
  if (/视频下载完成|音频下载完成/i.test(t)) return '媒体素材准备完成'
  if (/(\/app\/|\.m4s\b|\.mp3\b|\.mp4\b|\.wav\b|\.jpg\b|\.png\b)/i.test(t)) return '正在处理媒体素材'
  if (/https?:\/\//i.test(t) || low.includes('链接')) return '正在处理媒体资源信息'
  return t
    .replace(/^任务已创建\s*\(([^)]+)\)\s*$/i, (_, s: string) => `任务已创建（${statusLabel(s)}）`)
    .replace(/\bwaiting_user_pick\b/gi, '等待选择视频')
    .replace(/\bqueue_waiting_children\b/gi, '已入队等待逐个处理')
    .replace(/\bqueue_waiting\b/gi, '队列等待中')
    .replace(/\brun_selected_video_pipelines\b/gi, '处理已选视频')
    .replace(/\bmerge_multi_notes\b/gi, '合并多份笔记')
    .replace(/\bsearch_candidates\b/gi, '搜索候选视频')
    .replace(/\bai_select_video\b/gi, '筛选候选视频')
    .replace(/\binit\b/gi, '初始化')
}

function ensureJobUi(map: Record<string, JobUiState>, jobId: string): JobUiState {
  if (!map[jobId]) {
    map[jobId] = {
      snapshot: null,
      agentWorkflow: null,
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
        jobUi.logs.push({ ts: res.created_at, message: `任务已创建（${statusLabel(res.status)}）` })
        return res
      } finally {
        this.creating = false
      }
    },
    async fetchJob(jobId: string) {
      const snap = await getJobApi(jobId)
      const jobUi = ensureJobUi(this.jobs, jobId)
      jobUi.snapshot = snap
      jobUi.agentWorkflow = (snap.agent_workflow || (snap.result as any)?.agent_workflow || null) as AgentWorkflow | null
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
      if (type === 'heartbeat' || type === 'pong' || type === 'ws_status') return
      if (type === 'snapshot') {
        const snap = data as JobSnapshot
        jobUi.snapshot = snap
        jobUi.agentWorkflow = (snap?.agent_workflow || (snap?.result as any)?.agent_workflow || null) as AgentWorkflow | null
        return
      }
      jobUi.events.push({ type, data })
      if (jobUi.events.length > 1000) jobUi.events = jobUi.events.slice(-600)
      if (type === 'agent_update') {
        const d = data as any
        if (d?.workflow && typeof d.workflow === 'object') {
          jobUi.agentWorkflow = d.workflow as AgentWorkflow
          if (jobUi.snapshot) {
            jobUi.snapshot = {
              ...jobUi.snapshot,
              agent_workflow: d.workflow as AgentWorkflow,
            }
          }
        }
      }
      if (type === 'status') {
        const d = data as any
        if (jobUi.snapshot) {
          jobUi.snapshot = { ...jobUi.snapshot, stage: d.stage || '', detail: d.detail || '' }
        }
        const stage = humanizeStage(d?.stage)
        const detail = humanizeDetail(d?.detail, d?.stage)
        const msg = [stage, detail].filter(Boolean).join('：').replace(/：+/g, '：')
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
        jobUi.logs.push({ ts: d?.ts, message: 'AI 已筛选出候选视频，等待你选择后继续' })
        if (jobUi.logs.length > 2000) jobUi.logs = jobUi.logs.slice(-1200)
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
        const m = humanizeLogMessage(String(d?.message || ''))
        if (!m) return
        jobUi.logs.push({ ts: d?.ts, message: m })
        if (jobUi.logs.length > 2000) jobUi.logs = jobUi.logs.slice(-1200)
      }
    },
    connectJobEvents(jobId: string, force = false) {
      const jobUi = ensureJobUi(this.jobs, jobId)
      this._manualClosed[jobId] = false
      const existing = this._streamMap[jobId]
      if (!force && existing && (jobUi.sseStatus === 'connecting' || jobUi.sseStatus === 'connected')) {
        return
      }
      this.disconnectJobEvents(jobId, false)
      jobUi.sseStatus = 'connecting'

      const wsUrl = buildJobEventsWsUrl(jobId)
      let wsOpened = false

      const ws = openJobEventsWS(wsUrl, {
        onOpen: () => {
          wsOpened = true
          this._clearRetry(jobId)
          this._retryAttempts[jobId] = 0
          jobUi.sseStatus = 'connected'
        },
        onSnapshot: (snapshot) => {
          jobUi.snapshot = snapshot
          jobUi.agentWorkflow = (snapshot.agent_workflow || (snapshot.result as any)?.agent_workflow || null) as AgentWorkflow | null
          jobUi.sseStatus = 'connected'
        },
        onEvent: (type, data) => {
          this._applyRealtimeEvent(jobId, type, data)
          // 服务端可能在推送 waiting_user_pick 后立刻主动关闭 WS；
          // 这里补一次快照拉取，避免前端错过最终候选数据。
          if (type === 'waiting_user_pick') {
            void this.fetchJob(jobId).catch(() => undefined)
          }
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
          if ((d?.result as any)?.agent_workflow) {
            jobUi.agentWorkflow = (d.result as any).agent_workflow as AgentWorkflow
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
          jobUi.sseStatus = 'connecting'
          this._scheduleReconnect(jobId)
        },
        onClose: (ev) => {
          if (!wsOpened && this._manualClosed[jobId]) return
          const snapStatus = String(jobUi.snapshot?.status || '')
          if (this._manualClosed[jobId] || this._isTerminalStatus(snapStatus)) {
            jobUi.sseStatus = 'disconnected'
            return
          }
          const closeCode = Number(ev?.code || 0)
          const closeReason = String(ev?.reason || '')
          const isAwaitingPick = closeCode === 4003 || closeReason.includes('awaiting_user_pick')
          const isIdleTimeout = closeCode === 4002 || closeReason.includes('idle_timeout')
          // 后端在等待选择/空闲时会主动断开连接。
          // 先拉一次最新快照，保证界面能马上拿到 selected_videos；
          // 若任务仍在 running/queued，再自动重连继续追踪进度。
          if (isAwaitingPick || isIdleTimeout) {
            jobUi.sseStatus = 'disconnected'
            void this.fetchJob(jobId)
              .then((snap) => {
                if (this._manualClosed[jobId]) return
                const nextStatus = String(snap?.status || '')
                if (nextStatus === 'running' || nextStatus === 'queued') {
                  jobUi.sseStatus = 'connecting'
                  this._scheduleReconnect(jobId)
                }
              })
              .catch(() => {
                if (this._manualClosed[jobId]) return
                // waiting_user_pick 场景下拉快照失败也不要疯狂重连，避免界面抖动。
                if (isAwaitingPick) {
                  jobUi.sseStatus = 'disconnected'
                  return
                }
                jobUi.sseStatus = 'connecting'
                this._scheduleReconnect(jobId)
              })
            return
          }
          if (closeCode === 4429 || closeCode === 4404
            || closeReason.includes('too many connections')
            || closeReason.includes('job not found')
            || closeReason.includes('job_terminal')) {
            jobUi.sseStatus = 'disconnected'
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
