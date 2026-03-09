<template>
  <div class="p-4 h-full overflow-auto job-detail-page">
    <n-space vertical size="large">
      <n-card :title="`任务详情 · ${jobId}`" :bordered="false">
        <n-space justify="space-between" align="center">
          <n-space align="center">
            <n-tag :type="statusTagType(job?.status)">
              {{ statusLabel(job?.status) }}
            </n-tag>
            <n-tag type="info" size="small">{{ kindLabel(job?.kind) }}</n-tag>
          </n-space>
          <n-space>
            <n-button @click="refreshJob" :loading="loadingJob">刷新</n-button>
            <n-button @click="toggleSse">{{ sseBtnText }}</n-button>
            <n-button @click="goHome" quaternary>{{ backButtonLabel }}</n-button>
          </n-space>
        </n-space>

        <n-divider />
        <n-grid :cols="3" x-gap="12" y-gap="12" class="mb-4">
          <n-gi>
            <div class="rounded-lg p-3 bg-blue-500/10 border border-blue-400/20">
              <div class="text-xs opacity-70 mb-1">任务状态</div>
              <div class="flex items-center gap-2">
                <span
                  class="inline-block w-2.5 h-2.5 rounded-full"
                  :class="{
                    'bg-green-400': job?.status === 'running' || job?.status === 'completed',
                    'bg-blue-400': job?.status === 'queued' || !job?.status,
                    'bg-red-400': job?.status === 'failed',
                  }"
                />
                <span class="font-semibold">{{ statusLabel(job?.status) }}</span>
              </div>
              <div class="text-xs opacity-70 mt-1">{{ statusFriendlyHint }}</div>
            </div>
          </n-gi>
          <n-gi>
            <div class="rounded-lg p-3 bg-green-500/10 border border-green-400/20">
              <div class="text-xs opacity-70 mb-1">当前步骤</div>
              <div class="font-semibold">{{ displayStage }}</div>
              <div class="text-xs opacity-70 mt-1">{{ stageFriendlyHint }}</div>
            </div>
          </n-gi>
          <n-gi>
            <div class="rounded-lg p-3 bg-red-500/10 border border-red-400/20">
              <div class="text-xs opacity-70 mb-1">实时连接</div>
              <div class="flex items-center gap-2">
                <span
                  class="inline-block w-2.5 h-2.5 rounded-full"
                  :class="{
                    'bg-green-400': jobState?.sseStatus === 'connected',
                    'bg-blue-400': jobState?.sseStatus === 'connecting' || !jobState?.sseStatus || jobState?.sseStatus === 'idle',
                    'bg-red-400': jobState?.sseStatus === 'disconnected',
                  }"
                />
                <span class="font-semibold">{{ sseStatusLabel }}</span>
              </div>
              <div class="text-xs opacity-70 mt-1">{{ sseHumanExplanation }}</div>
            </div>
          </n-gi>
        </n-grid>

        <n-space vertical size="small" class="text-base">
          <div><strong>你的需求：</strong>{{ job?.user_input || '-' }}</div>
          <div>
            <strong>当前进度：</strong>
            <span>{{ displayStage }}</span>
          </div>
          <div>
            <strong>AI 正在做什么：</strong>
            <span>{{ displayDetail }}</span>
          </div>
          <div class="flex items-center gap-2">
            <strong>实时连接：</strong>
            <n-tag :type="sseTagType" size="small">{{ sseStatusLabel }}</n-tag>
            <span class="text-xs opacity-70">{{ sseStatusHint }}</span>
          </div>
          <n-alert v-if="job?.error" type="error" :show-icon="false">
            {{ humanizeError(job.error) }}
          </n-alert>
          <n-alert v-if="singleJobKnowledgeReused" type="success" :show-icon="false">
            <div class="font-medium">已复用知识：该视频已有历史笔记，系统跳过了重复处理流程。</div>
            <div class="text-xs opacity-80 mt-1" v-if="singleKnowledgeMeta?.title || singleKnowledgeMeta?.video_url">
              来源：
              {{ singleKnowledgeMeta?.title || '历史知识条目' }}
              <template v-if="singleKnowledgeMeta?.up_name">（UP：{{ singleKnowledgeMeta?.up_name }}）</template>
              <template v-if="singleKnowledgeMeta?.duration_text"> · 时长 {{ singleKnowledgeMeta?.duration_text }}</template>
            </div>
          </n-alert>
          <n-alert v-else-if="reusedVideoRuns.length" type="info" :show-icon="false">
            已复用知识：本任务共复用了 {{ reusedVideoRuns.length }} 个已处理视频笔记，跳过重复转写/生成步骤。
          </n-alert>
        </n-space>
      </n-card>

      <n-grid :cols="2" x-gap="12" y-gap="12">
        <n-gi>
          <n-card title="AI 过程日志" :bordered="false">
            <template #header-extra>
              <n-space v-if="isAdminUser" size="small">
                <n-button
                  size="tiny"
                  quaternary
                  :type="logViewMode === 'normal' ? 'primary' : 'default'"
                  @click="setLogViewMode('normal')"
                >
                  普通
                </n-button>
                <n-button
                  size="tiny"
                  quaternary
                  :type="logViewMode === 'detail' ? 'primary' : 'default'"
                  @click="setLogViewMode('detail')"
                >
                  详细
                </n-button>
              </n-space>
            </template>

            <div ref="aiLogsContainerRef" class="h-[420px] overflow-auto rounded-md p-3 job-scroll-panel">
              <div v-if="isDetailMode && detailLogsLoading" class="text-xs opacity-60 py-2">
                正在加载详细日志...
              </div>
              <template v-if="displayLogs.length">
                <div
                  v-for="(log, idx) in displayLogs"
                  :key="idx"
                  class="text-sm leading-6 border-b border-black/5 dark:border-white/5 py-2"
                >
                  <div class="flex items-start gap-2">
                    <span
                      class="mt-2 inline-block w-2 h-2 rounded-full shrink-0"
                      :class="{
                        'bg-blue-400': log.tone === 'info',
                        'bg-green-400': log.tone === 'success',
                        'bg-red-400': log.tone === 'error',
                      }"
                    />
                    <div class="min-w-0 flex-1">
                      <div class="text-xs opacity-60">{{ log.ts || '--:--:--' }}</div>
                      <div class="flex items-center gap-2 mb-1">
                        <n-tag size="tiny" :type="logTagType(log.tone)">
                          {{ logLabel(log.tone) }}
                        </n-tag>
                      </div>
                      <div class="whitespace-pre-wrap break-words">{{ log.message }}</div>
                    </div>
                  </div>
                </div>
              </template>
              <n-empty v-else description="AI 正在准备中，稍后会显示过程说明..." />
            </div>
          </n-card>
        </n-gi>

        <n-gi>
          <n-card title="任务进度与结果" :bordered="false">
            <n-tabs type="line" animated>
              <n-tab-pane name="summary" tab="任务摘要">
                <n-space vertical size="small">
                  <div><strong>任务状态：</strong>{{ statusLabel(job?.status) }}</div>
                  <div><strong>任务类型：</strong>{{ kindLabel(job?.kind) }}</div>
                  <div><strong>阶段：</strong>{{ displayStage }}</div>
                  <div><strong>说明：</strong>{{ displayDetail }}</div>
                  <div v-if="videoRuns.length"><strong>已处理视频：</strong>{{ videoRuns.length }} 个</div>
                  <div v-if="reusedVideoRuns.length"><strong>复用知识：</strong>{{ reusedVideoRuns.length }} 个视频</div>
                  <div v-if="topicQueueBatch"><strong>你的队列：</strong>{{ topicQueueBatch.user_pending_count ?? 0 }}</div>
                  <div v-if="topicQueueBatch"><strong>全局队列：</strong>{{ topicQueueBatch.global_pending_count ?? 0 }}</div>
                  <div v-if="topicQueueBatch?.current_processing_item?.title"><strong>当前处理：</strong>{{ topicQueueBatch.current_processing_item.title }}</div>
                  <div v-if="noteLink"><strong>结果文件：</strong>{{ noteLink.file_name }}</div>
                </n-space>
              </n-tab-pane>
              <n-tab-pane name="videos" tab="视频处理">
                <template v-if="videoRuns.length">
                  <n-list bordered>
                    <n-list-item v-for="(v, idx) in videoRuns" :key="`${v.bili_url}-${idx}`">
                      <n-space vertical size="small" class="w-full">
                        <n-space justify="space-between">
                          <div class="font-medium truncate max-w-[420px]">{{ v.title || v.bili_url }}</div>
                          <n-space size="small">
                            <n-tag v-if="v.pipeline_result?.knowledge_reused" size="small" type="success">已复用知识</n-tag>
                            <n-tag size="small" :type="statusTagType(v.status)">{{ statusLabel(v.status) }}</n-tag>
                          </n-space>
                        </n-space>
                        <div class="text-xs opacity-70 break-all">{{ v.bili_url }}</div>
                        <div
                          v-if="v.pipeline_result?.knowledge_reused"
                          class="text-xs text-green-600 dark:text-green-400"
                        >
                          命中全局知识库，跳过重复处理，直接复用历史笔记。
                        </div>
                        <div v-if="v.pipeline_result?.note_md" class="text-xs opacity-70">
                          中间笔记已生成（信息保留版）
                        </div>
                        <div v-if="v.error" class="text-xs text-red-500">{{ v.error }}</div>
                      </n-space>
                    </n-list-item>
                  </n-list>
                </template>
                <n-empty v-else description="该任务暂无视频处理明细" />
              </n-tab-pane>
              <n-tab-pane name="events" tab="实时播报">
                <div class="text-xs opacity-70 mb-2">
                  这里显示的是“实时连接通道”推送的进度播报，可以理解为系统在边做边汇报。
                </div>
                <div class="h-[320px] overflow-auto rounded-md p-3 job-scroll-panel">
                  <template v-if="displayEvents.length">
                    <div
                      v-for="(ev, idx) in displayEvents"
                      :key="idx"
                      class="py-2 border-b border-black/5 dark:border-white/5"
                    >
                      <n-space justify="space-between" align="center">
                        <n-tag size="small" :type="eventTagType(ev.type)">{{ eventLabel(ev.type) }}</n-tag>
                        <span class="text-xs opacity-60">{{ ev.ts || '--:--:--' }}</span>
                      </n-space>
                      <div class="text-sm mt-1 whitespace-pre-wrap break-words">{{ ev.text }}</div>
                    </div>
                  </template>
                  <n-empty v-else description="等待实时播报事件..." />
                </div>
              </n-tab-pane>
              <n-tab-pane name="debug" tab="开发者JSON（高级）">
                <div class="h-[320px] overflow-auto">
                  <n-alert type="info" :show-icon="false" class="mb-3">
                    这是给开发排查问题用的原始数据，一般用户无需查看。
                  </n-alert>
                  <n-tabs type="segment" size="small">
                    <n-tab-pane name="job-json" tab="任务原始数据">
                      <pre class="text-xs whitespace-pre-wrap break-all">{{ prettyJob }}</pre>
                    </n-tab-pane>
                    <n-tab-pane name="event-json" tab="事件原始数据">
                      <pre class="text-xs whitespace-pre-wrap break-all">{{ prettyEvents }}</pre>
                    </n-tab-pane>
                  </n-tabs>
                </div>
              </n-tab-pane>
            </n-tabs>
          </n-card>
        </n-gi>
      </n-grid>

      <n-card title="最终 Markdown 笔记" :bordered="false">
        <template #header-extra>
          <n-space>
            <n-button @click="loadNote" :disabled="!isCompleted" :loading="loadingNote">加载笔记</n-button>
            <n-button @click="copyDownloadUrl" :disabled="!noteLink">复制下载链接</n-button>
            <n-button tag="a" :href="noteDownloadFullUrl" target="_blank" :disabled="!noteLink">
              下载文件
            </n-button>
          </n-space>
        </template>

        <div v-if="noteLink" class="text-xs opacity-70 mb-3">
          文件：{{ noteLink.file_name }}<br />
          路径：{{ noteLink.abs_path }}
        </div>

        <div
          v-if="noteTextLocal"
          class="rounded-xl p-4 max-h-[70vh] overflow-auto job-note-surface"
        >
          <MarkdownContent :source="noteTextLocal" />
        </div>
        <div
          v-else
          class="rounded-xl border border-dashed border-slate-300/80 dark:border-slate-700/80 p-6 text-sm opacity-70"
        >
          任务完成后点击“加载笔记”查看内容（支持前端 Markdown 渲染）。
        </div>
      </n-card>
    </n-space>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NCard,
  NDivider,
  NEmpty,
  NGi,
  NGrid,
  NList,
  NListItem,
  NSpace,
  NTabPane,
  NTabs,
  NTag,
  NText,
  useMessage,
} from 'naive-ui'
import { useJobsStore } from '@/stores/modules/useJobsStore'
import { useChatStore } from '@/stores/modules/useChatStore'
import { useAuthStore } from '@/stores/modules/useAuthStore'
import { buildJobNoteDownloadUrl, getAdminJobPushLogsApi } from '@/api/jobs'
import { getApiBaseUrl } from '@/api/client'
import MarkdownContent from '@/components/MarkdownContent.vue'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const jobsStore = useJobsStore()
const chatStore = useChatStore()
const authStore = useAuthStore()

const loadingJob = ref(false)
const loadingNote = ref(false)
const aiLogsContainerRef = ref<HTMLElement | null>(null)
const logViewMode = ref<'normal' | 'detail'>('normal')
const detailLogsLoading = ref(false)
const detailLogs = ref<Array<{ ts?: string; message: string }>>([])

const jobId = computed(() => String(route.params.jobId || ''))
const jobState = computed(() => jobsStore.jobs[jobId.value] || null)
const job = computed(() => jobState.value?.snapshot || null)
const noteLink = computed(() => jobState.value?.noteLink || null)

const isCompleted = computed(() => job.value?.status === 'completed')
const videoRuns = computed(() => {
  const result = job.value?.result as any
  return Array.isArray(result?.video_runs) ? result.video_runs : []
})
const jobResult = computed(() => (job.value?.result as any) || {})
const topicQueueBatch = computed(() => {
  const qb = jobResult.value?.queue_batch
  return qb && typeof qb === 'object' ? qb : null
})
const singleJobKnowledgeReused = computed(
  () =>
    Boolean(jobResult.value?.knowledge_reused) ||
    String(jobResult.value?.task_state || '') === 'reused_from_global_knowledge',
)
const singleKnowledgeMeta = computed(() => {
  const meta = jobResult.value?.knowledge_meta
  return meta && typeof meta === 'object' ? meta : null
})
const reusedVideoRuns = computed(() => videoRuns.value.filter((v: any) => Boolean(v?.pipeline_result?.knowledge_reused)))

const noteTextLocal = computed({
  get: () => jobState.value?.noteText || '',
  set: () => undefined,
})

const prettyJob = computed(() => JSON.stringify(job.value, null, 2))
const prettyEvents = computed(() => JSON.stringify(jobState.value?.events || [], null, 2))
const noteDownloadFullUrl = computed(() => {
  if (!jobId.value || !noteLink.value) return undefined
  return buildJobNoteDownloadUrl(jobId.value)
})
const isAdminUser = computed(() => String(authStore.user?.role || '') === 'admin')
const isDetailMode = computed(() => isAdminUser.value && logViewMode.value === 'detail')

const sseBtnText = computed(() => (jobState.value?.sseStatus === 'connected' ? '暂停实时连接' : '开启实时连接'))
const sourceSessionFromRoute = computed(() => String(route.query.session || '').trim())
const sourceSession = computed(() => sourceSessionFromRoute.value || chatStore.getJobSourceSession(jobId.value))
const backButtonLabel = computed(() => (sourceSession.value ? '返回对话' : '返回任务中心'))

const displayStage = computed(() => humanizeStage(job.value?.stage || ''))
const displayDetail = computed(() => humanizeDetail(job.value?.detail || '', job.value?.stage || ''))

const sseTagType = computed(() => {
  const s = jobState.value?.sseStatus || 'idle'
  if (s === 'connected') return 'success'
  if (s === 'connecting') return 'info'
  if (s === 'disconnected') return 'error'
  return 'default'
})

const sseStatusLabel = computed(() => {
  const s = jobState.value?.sseStatus || 'idle'
  if (s === 'connected') return '已连接'
  if (s === 'connecting') return '连接中'
  if (s === 'disconnected') return '已断开'
  return '未开启'
})

const sseStatusHint = computed(() => {
  const s = jobState.value?.sseStatus || 'idle'
  if (s === 'connected') return '任务进度会实时自动更新'
  if (s === 'connecting') return '正在连接实时进度通道'
  if (s === 'disconnected') return '可点击“开启实时连接”继续查看'
  return '点击“开启实时连接”查看实时进度'
})

const sseHumanExplanation = computed(() => {
  const s = jobState.value?.sseStatus || 'idle'
  if (s === 'connected') return '系统会实时播报处理进度（绿色表示正常）'
  if (s === 'connecting') return '正在建立实时播报通道（蓝色表示处理中）'
  if (s === 'disconnected') return '实时播报已断开，可重新连接（红色提示）'
  return '未开启实时播报，可手动开启'
})

const statusFriendlyHint = computed(() => {
  const s = job.value?.status
  if (s === 'running') return '任务正在执行中，系统会持续更新进度'
  if (s === 'queued') return '任务已进入队列，马上开始'
  if (s === 'waiting_user_pick') return 'AI 已筛出候选视频，等待你选择需要总结的视频后再继续'
  if (s === 'completed') return '任务已完成，可以查看并下载笔记'
  if (s === 'failed') return '任务中途失败，可根据提示检查配置后重试'
  return '等待任务状态更新'
})

const stageFriendlyHint = computed(() => {
  const stage = String(job.value?.stage || '')
  if (stage.includes('search')) return 'AI 正在找更合适的视频资料'
  if (stage.includes('merge')) return 'AI 正在把多份笔记归纳成一份更清晰的总结'
  if (stage.includes('transcribe')) return '系统正在把语音内容转成文字'
  if (stage.includes('generate')) return 'AI 正在整理知识点并生成笔记'
  if (stage.includes('extract_audio')) return '系统正在准备音频素材'
  return '系统正在推进当前步骤'
})

const displayLogs = computed(() => {
  if (isDetailMode.value) {
    return detailLogs.value.map((x) => ({
      ts: x.ts,
      message: String(x.message || ''),
      tone: inferLogTone(x.message || ''),
    }))
  }
  const logs = jobState.value?.logs || []
  return logs.map((x) => ({
    ts: x.ts,
    message: humanizeLogMessage(x.message || ''),
    tone: inferLogTone(x.message || ''),
  }))
})

const displayEvents = computed(() => {
  const events = (jobState.value?.events || []) as Array<any>
  return events
    .filter((ev) => {
      const type = String(ev?.type || 'message')
      return type !== 'heartbeat' && type !== 'ws_status' && type !== 'pong' && type !== 'snapshot'
    })
    .slice(-80)
    .map((ev) => {
      const type = String(ev?.type || 'message')
      const data = ev?.data ?? ev
      return {
        type,
        ts: ev?.ts || data?.ts || '',
        text: humanizeEvent(type, data),
      }
    })
})

function setLogViewMode(mode: 'normal' | 'detail') {
  if (mode === 'detail' && !isAdminUser.value) {
    logViewMode.value = 'normal'
    return
  }
  logViewMode.value = mode
}

function formatAdminDetailLogMessage(row: any) {
  const type = String(row?.type || '').trim().toLowerCase()
  const rawMessage = String(row?.raw_message || '').trim()
  const message = String(row?.message || '').trim()
  const publicMessage = String(row?.public_message || '').trim()
  const text = rawMessage || message || publicMessage
  if (text) return text
  if (type === 'status') {
    const stage = String(row?.stage || '').trim()
    const detail = String(row?.detail || '').trim()
    return [stage, detail].filter(Boolean).join(' · ') || '状态更新'
  }
  return type ? `[${type}]` : '日志事件'
}

async function loadDetailLogs() {
  if (!isDetailMode.value || !jobId.value) {
    detailLogs.value = []
    return
  }
  detailLogsLoading.value = true
  try {
    const res = await getAdminJobPushLogsApi(jobId.value, { limit: 1000, includeNonLog: true })
    const items = Array.isArray((res as any)?.items) ? ((res as any).items as any[]) : []
    detailLogs.value = items
      .map((row) => ({
        ts: String((row as any)?.ts || ''),
        message: formatAdminDetailLogMessage(row),
      }))
      .filter((x) => String(x.message || '').trim())
      .slice(-1000)
  } catch (e: any) {
    detailLogs.value = []
    message.error(e?.message || '加载详细日志失败')
  } finally {
    detailLogsLoading.value = false
  }
}

watch(
  () => [jobId.value, isAdminUser.value, logViewMode.value] as const,
  async ([id, isAdmin, mode]) => {
    if (!isAdmin && mode !== 'normal') {
      logViewMode.value = 'normal'
      detailLogs.value = []
      return
    }
    if (id && mode === 'detail') {
      await loadDetailLogs()
      return
    }
    detailLogs.value = []
  },
  { immediate: true },
)

watch(
  () => displayLogs.value.length,
  async () => {
    await nextTick()
    const el = aiLogsContainerRef.value
    if (!el) return
    el.scrollTop = el.scrollHeight
  },
)

async function refreshJob() {
  if (!jobId.value) return
  loadingJob.value = true
  try {
    const snap = await jobsStore.fetchJob(jobId.value)
    if (isDetailMode.value) {
      await loadDetailLogs()
    }
    if (snap.status === 'completed') {
      await Promise.allSettled([jobsStore.fetchNote(jobId.value), jobsStore.fetchNoteLink(jobId.value)])
    }
  } catch (e: any) {
    message.error(e?.message || '获取任务失败')
  } finally {
    loadingJob.value = false
  }
}

async function loadNote() {
  if (!jobId.value) return
  loadingNote.value = true
  try {
    await Promise.all([jobsStore.fetchNote(jobId.value), jobsStore.fetchNoteLink(jobId.value)])
  } catch (e: any) {
    message.error(e?.message || '加载笔记失败')
  } finally {
    loadingNote.value = false
  }
}

function toggleSse() {
  if (!jobId.value) return
  if (jobState.value?.sseStatus === 'connected') {
    jobsStore.disconnectJobEvents(jobId.value)
    return
  }
  jobsStore.connectJobEvents(jobId.value)
}

async function copyDownloadUrl() {
  if (!jobId.value || !noteLink.value) return
  const full = `${getApiBaseUrl()}${noteLink.value.download_url}`
  try {
    await navigator.clipboard.writeText(full)
    message.success('已复制下载链接')
  } catch {
    message.warning(`复制失败，请手动复制：${full}`)
  }
}

function goHome() {
  const from = String(route.query.from || '')
  const session = sourceSession.value
  if (from === 'chat' && session) {
    router.push({ path: '/home', query: { session } })
    return
  }
  if (session) {
    router.push({ path: '/home', query: { session } })
    return
  }
  router.push('/home')
}

function statusTagType(status?: string) {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'running') return 'success' // 用户要求：运行中显示绿色
  if (status === 'queued') return 'info'
  if (status === 'init') return 'info'
  if (status === 'waiting_user_pick') return 'warning'
  return 'default'
}

function statusLabel(status?: string) {
  const s = String(status || '').trim().toLowerCase()
  if (!s) return '未知'
  if (s === 'completed') return '已完成'
  if (s === 'failed') return '失败'
  if (s === 'running') return '运行中'
  if (s === 'queued') return '排队中'
  if (s === 'init') return '初始化中'
  if (s === 'waiting_user_pick') return '等待选择视频'
  return '处理中'
}

function kindLabel(kind?: string) {
  if (kind === 'topic') return '主题检索任务'
  if (kind === 'single_video') return '单视频任务'
  return '任务'
}

function humanizeStage(stage: string) {
  const s = (stage || '').trim()
  if (!s) return '等待任务开始'
  if (s === 'init') return '初始化任务'
  if (s.includes('search_round_')) return 'AI 正在检索并评估候选视频'
  if (s === 'waiting_user_pick') return '等待你选择要总结的视频'
  if (s === 'queue_waiting') return '已加入全局队列，等待处理'
  if (s === 'queue_waiting_children') return '已加入队列，等待逐个处理视频'
  if (s === 'run_selected_video_pipelines') return 'AI 正在逐个处理已选视频'
  if (s === 'merge_multi_notes') return 'AI 正在合并多份中间笔记（归纳总结）'
  if (s === 'search_candidates') return '正在搜索候选视频'
  if (s === 'ai_select_video') return 'AI 正在筛选候选视频'
  if (s === 'extract_audio_url') return '正在准备音频素材'
  if (s === 'download_audio') return '正在准备音频素材'
  if (s === 'convert_mp3') return '正在转换音频格式'
  if (s === 'demucs') return '正在分离人声'
  if (s === 'transcribe') return '正在语音转文字'
  if (s === 'generate_note') return 'AI 正在生成笔记'
  if (s === 'cleanup') return '正在清理中间文件'
  if (s === 'done') return '任务已完成'
  if (s.includes('failed')) return '任务执行失败'
  return s.replace(/_/g, ' ')
}

function humanizeDetail(detail: string, stage: string) {
  let d = (detail || '').trim()
  if (!d) return '系统正在处理，请稍候'
  if (d.includes('Error code: 401 - Invalid token')) {
    return '模型服务认证失败（大模型 API Key 无效或未配置）'
  }
  if ((stage || '').includes('search_round_')) {
    d = d.replace(/^search_round_\d+[:：]\s*/i, '')
  }
  return d
    .replace(/\bwaiting_user_pick\b/gi, '等待选择视频')
    .replace(/\bqueue_waiting_children\b/gi, '已入队等待逐个处理')
    .replace(/\bqueue_waiting\b/gi, '队列等待中')
    .replace(/\brun_selected_video_pipelines\b/gi, '处理已选视频')
    .replace(/\bmerge_multi_notes\b/gi, '合并多份笔记')
    .replace(/\bsearch_candidates\b/gi, '搜索候选视频')
    .replace(/\bai_select_video\b/gi, '筛选候选视频')
    .replace(/\binit\b/gi, '初始化')
}

function humanizeError(err: string) {
  if (!err) return ''
  if (err.includes('Invalid token')) {
    return '模型服务认证失败：请检查 OPENAI_API_KEY / OPENAI_BASE_URL 配置是否正确。'
  }
  return err
}

function shortenUrl(text: string) {
  return text.replace(/https?:\/\/[^\s]+/g, (m) => {
    try {
      const u = new URL(m)
      return `${u.origin}${u.pathname}${u.search ? '（已省略参数）' : ''}`
    } catch {
      return '链接（已省略）'
    }
  })
}

function humanizeLogMessage(message: string) {
  let m = (message || '').trim()
  if (!m) return '系统处理中...'
  const low = m.toLowerCase()
  if (/^run:/i.test(m)) return '正在执行处理步骤'
  if (/开始下载|下载视频中|下载音频|下载视频|download/i.test(m)) return '正在准备媒体素材'
  if (/视频下载完成|音频下载完成/i.test(m)) return '媒体素材准备完成'
  if (/(\/app\/|\.m4s\b|\.mp3\b|\.mp4\b|\.wav\b|\.jpg\b|\.png\b)/i.test(m)) return '正在处理媒体素材'
  if (/https?:\/\//i.test(m) || low.includes('链接')) return '正在处理媒体资源信息'
  m = shortenUrl(m)
  m = m
    .replace(/^任务已创建\s*\(queued\)/, '任务已创建，正在排队准备执行')
    .replace(/^Playwright 打开 B站搜索页[:：]?/i, '正在打开 B站搜索页面')
    .replace(/^抓取搜索结果[:：]?/i, '正在查询搜索结果')
    .replace(/^查询搜索结果[:：]?/i, '正在查询搜索结果')
    .replace(/^第 \d+ 页抓取候选[:：]?/i, (s) => s.replace('抓取候选', '已查询候选'))
    .replace(/^第 \d+ 页查询候选[:：]?/i, (s) => s.replace('查询候选', '已查询候选'))
    .replace(/^AI 粗筛完成[:：]?/i, 'AI 已完成初步筛选：')
    .replace(/^AI 当前选择/i, 'AI 已选出一批更匹配的视频：')
    .replace(/^开始处理选中视频/i, '开始处理已选视频')
    .replace(/^已收集中间笔记/i, '已完成一份中间笔记（信息保留版）')
    .replace(/^开始合并多份中间笔记/i, 'AI 正在合并多份中间笔记（生成最终归纳版）')
    .replace(/^开始调用模型合并中间笔记/i, 'AI 正在汇总和归纳多份笔记（此步骤可能稍慢）')
    .replace(/^模型已返回主题合并笔记结果/i, 'AI 已完成多笔记合并，正在整理格式')
    .replace(/^调用模型生成 Markdown 笔记/i, 'AI 正在生成 Markdown 笔记')
    .replace(/^笔记已写入/i, '笔记已保存到本地')
    .replace(/^已清理中间音频文件/i, '中间音频文件已清理（节省空间）')
    .replace(/^转写文本长度[:：]?\s*(\d+)\s*字符/i, '语音已转文字（约 $1 字）')
    .replace(/^已获取音频主链接/i, '已获取媒体资源信息')
    .replace(/\bwaiting_user_pick\b/gi, '等待选择视频')
    .replace(/\bqueue_waiting_children\b/gi, '已入队等待逐个处理')
    .replace(/\bqueue_waiting\b/gi, '队列等待中')
    .replace(/\brun_selected_video_pipelines\b/gi, '处理已选视频')
    .replace(/\bmerge_multi_notes\b/gi, '合并多份笔记')
    .replace(/\bsearch_candidates\b/gi, '搜索候选视频')
    .replace(/\bai_select_video\b/gi, '筛选候选视频')
    .replace(/\binit\b/gi, '初始化')
  return m
}

function inferLogTone(message: string): 'info' | 'success' | 'error' {
  const m = (message || '').toLowerCase()
  if (/失败|error|invalid token|异常/.test(m)) return 'error'
  if (/完成|已保存|已清理|已获取|已收集|success/.test(m)) return 'success'
  return 'info'
}

function logTagType(tone: 'info' | 'success' | 'error') {
  if (tone === 'success') return 'success'
  if (tone === 'error') return 'error'
  return 'info'
}

function logLabel(tone: 'info' | 'success' | 'error') {
  if (tone === 'success') return '已完成'
  if (tone === 'error') return '需要处理'
  return '处理中'
}

function eventTagType(type: string) {
  if (type === 'failed') return 'error'
  if (type === 'completed') return 'success'
  if (type === 'status') return 'info'
  if (type === 'log') return 'default'
  if (type === 'heartbeat') return 'success'
  return 'default'
}

function eventLabel(type: string) {
  const t = String(type || '')
  if (t === 'status') return '进度更新'
  if (t === 'log') return '过程说明'
  if (t === 'completed') return '已完成'
  if (t === 'failed') return '失败'
  if (t === 'waiting_user_pick') return '等待操作'
  if (t === 'queue_status') return '队列状态'
  if (t === 'topic_selected_videos') return '候选结果'
  if (t === 'job_created') return '任务创建'
  return '过程事件'
}

function humanizeEvent(type: string, data: any) {
  if (type === 'status') {
    return `${humanizeStage(String(data?.stage || ''))}：${humanizeDetail(String(data?.detail || ''), String(data?.stage || ''))}`
  }
  if (type === 'log') {
    return humanizeLogMessage(String(data?.message || ''))
  }
  if (type === 'completed') {
    return '任务处理完成，结果已生成。'
  }
  if (type === 'failed') {
    return humanizeError(String(data?.error || '任务执行失败'))
  }
  if (type === 'job_created') {
    return '任务已创建，等待系统开始处理'
  }
  if (type === 'waiting_user_pick') {
    return 'AI 已筛选出候选视频，等待你选择后继续执行。'
  }
  if (type === 'queue_status') {
    const queue = (data?.queue_batch || data?.queue || {}) as Record<string, any>
    const userPending = Number(queue?.user_pending_count || 0)
    const globalPending = Number(queue?.global_pending_count || 0)
    return `队列更新：你的队列 ${userPending}，全局队列 ${globalPending}`
  }
  if (type === 'topic_selected_videos') {
    const count = Number(data?.count || (Array.isArray(data?.items) ? data.items.length : 0) || 0)
    return `AI 已筛选出 ${count} 条候选视频`
  }
  return '任务正在处理中'
}

async function bootstrap() {
  if (!jobId.value) return
  jobsStore.setCurrentJob(jobId.value)
  await refreshJob()
  if (job.value?.status === 'running' || job.value?.status === 'queued' || job.value?.status === 'waiting_user_pick') {
    jobsStore.connectJobEvents(jobId.value, true)
  }
}

watch(jobId, () => {
  bootstrap()
})

onMounted(() => {
  bootstrap()
})

onBeforeUnmount(() => {
  if (jobId.value) jobsStore.disconnectJobEvents(jobId.value)
})
</script>

<style scoped>
.job-detail-page {
  background: transparent;
}

.job-scroll-panel {
  border: 1px solid rgba(203, 213, 225, 0.72);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85);
}

.job-note-surface {
  border: 1px solid rgba(203, 213, 225, 0.78);
  background: #fff;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 8px 20px rgba(15, 23, 42, 0.04);
}

.job-note-surface :deep(.md-content) {
  color: #1f2937;
}

:global(.dark) .job-scroll-panel {
  border-color: rgba(71, 85, 105, 0.66);
  background: rgba(15, 23, 42, 0.44);
  box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.03);
}

:global(.dark) .job-note-surface {
  border-color: rgba(71, 85, 105, 0.66);
  background: rgba(15, 23, 42, 0.62);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
}

:global(.dark) .job-note-surface :deep(.md-content) {
  color: rgba(226, 232, 240, 0.96);
}
</style>
