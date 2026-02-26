<template>
  <div class="p-2 h-full overflow-hidden">
    <n-grid :cols="24" x-gap="12" class="h-full">
      <n-gi :span="18" class="h-full">
        <n-card :bordered="false" class="h-full right-rail-card">
          <div class="h-full flex flex-col">
            <div class="px-2 pb-2 grid grid-cols-[1fr_auto] items-center gap-3">
              <div class="flex items-center">
                <div class="text-sm opacity-80">对话模式</div>
              </div>
              <div class="flex items-center justify-end gap-2">
                <span class="text-xs opacity-60">模型</span>
                <n-select
                  v-model:value="selectedModel"
                  size="small"
                  style="width: 280px"
                  :options="modelOptions"
                  :loading="modelsLoading"
                  clearable
                  placeholder="默认模型"
                />
              </div>
            </div>

            <div ref="messagesContainerRef" class="flex-1 min-h-0 overflow-auto px-1 py-1">
              <div class="space-y-4">
                <div v-if="messages.length === 0" class="h-full min-h-[220px] flex items-center justify-center">
                  <div class="text-center max-w-xl px-6">
                    <div class="text-lg font-semibold mb-2">像 ChatGPT 一样先聊天，再决定是否创建任务</div>
                    <div class="text-sm opacity-70 leading-6">
                      你可以先问功能、问概念、问思路。需要我去 B 站检索并整理笔记时，再打开“知识检索”发送即可。
                    </div>
                  </div>
                </div>

                <div
                  v-for="msg in messages"
                  :key="msg.localId"
                  class="flex gap-3"
                  :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
                >
                  <template v-if="msg.role !== 'user'">
                    <div class="mt-1 h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ai-avatar">
                      AI
                    </div>
                  </template>

                  <div class="max-w-[86%]">
                    <div class="text-xs opacity-65 mb-1 px-1">
                      {{ msg.role === 'user' ? currentUserLabel : '小知AI' }}
                    </div>
                    <div
                      class="rounded-2xl px-4 py-3 whitespace-pre-wrap break-words message-bubble"
                      :class="[
                        msg.role === 'user' ? 'message-user' : 'message-assistant',
                        msg.pending ? 'opacity-70' : '',
                      ]"
                    >
                      <div v-if="msg.pending" class="text-sm opacity-70">思考中...</div>
                      <div v-else>{{ msg.content }}</div>
                    </div>

                    <div
                      v-if="msg.role === 'assistant' && (msg.task || msg.toolDecisionReason)"
                      class="mt-2 px-1 flex flex-wrap items-center gap-2 text-xs"
                    >
                      <n-tag v-if="msg.task" type="info" size="small">
                        已创建任务：{{ msg.task.job_id }}
                      </n-tag>
                      <n-button
                        v-if="msg.task"
                        text
                        type="primary"
                        size="tiny"
                        @click="openJob(msg.task.job_id)"
                      >
                        查看任务详情
                      </n-button>
                      <span v-if="msg.toolDecisionReason" class="opacity-65">意图判断：{{ msg.toolDecisionReason }}</span>
                    </div>
                  </div>

                  <template v-if="msg.role === 'user'">
                    <div class="mt-1 h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold user-avatar">
                      {{ currentUserLabel.slice(0, 1) }}
                    </div>
                  </template>
                </div>
              </div>
            </div>

            <div class="pt-3">
              <div class="rounded-[24px] composer-shell px-4 py-3">
                <div class="mb-2 flex items-center justify-between gap-3">
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      class="knowledge-toggle"
                      :class="{ 'knowledge-toggle--active': knowledgeRetrievalEnabled }"
                      @click="knowledgeRetrievalEnabled = !knowledgeRetrievalEnabled"
                    >
                      知识检索
                    </button>
                    <span class="text-xs opacity-65">
                      {{ knowledgeRetrievalEnabled ? '已开启：允许 AI 创建 B 站检索/转笔记任务（主题内容可直接用问句）' : '未开启：仅聊天回复，不创建任务' }}
                    </span>
                  </div>
                </div>

                <n-input
                  v-model:value="userInput"
                  type="textarea"
                  :autosize="{ minRows: 3, maxRows: 8 }"
                  class="chat-composer-input"
                  placeholder="先像聊天一样输入问题（如：你能帮我做什么 / 什么是LLM？）。需要执行B站检索与转笔记时，再开启上方“知识检索”（主题内容可直接用问句）。"
                  @keydown.enter.exact.prevent="handleEnterSend"
                />

                <div class="mt-3 flex items-center justify-between gap-3">
                  <div class="text-xs opacity-70">
                    Enter发送 · Shift+Enter换行 · 关闭“知识检索”时不会自动建任务
                  </div>
                  <n-space align="center">
                    <n-button @click="clearInput" quaternary>清空</n-button>
                    <button
                      type="button"
                      class="send-icon-btn"
                      :disabled="(!userInput.trim() && !sending) || sending"
                      title="发送"
                      @click="sendMessage"
                    >
                      <span v-if="sending" class="send-icon-spinner" />
                      <n-icon v-else :component="ArrowUpOutline" size="18" />
                    </button>
                  </n-space>
                </div>
              </div>
            </div>
          </div>
        </n-card>
      </n-gi>

      <n-gi :span="6" class="h-full">
        <n-card :bordered="false" class="h-full">
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-semibold">当前任务进度</span>
              <n-tag size="small" :type="tagType(currentSnapshot?.status)">
                {{ statusLabel(currentSnapshot?.status) }}
              </n-tag>
            </div>
          </template>

          <template v-if="jobsStore.currentJobId">
            <div class="h-full flex flex-col gap-3">
              <div class="rail-section rail-section--meta">
                <div class="text-xs opacity-70 mb-1">当前任务ID</div>
                <div class="font-mono text-xs break-all">{{ jobsStore.currentJobId }}</div>
              </div>

              <div class="rail-section rail-section--stage">
                <div class="text-xs opacity-70 mb-1">正在进行的步骤</div>
                <div class="font-medium">{{ humanizeStage(currentSnapshot?.stage || '') || '等待中' }}</div>
                <div class="text-xs opacity-70 mt-1">{{ currentSnapshot?.detail || '系统将自动更新' }}</div>
              </div>

              <div class="rail-section rail-section--actions">
                <div class="text-xs opacity-70 mb-1">快捷操作</div>
                <n-space vertical>
                  <n-button block @click="refreshCurrentJob" :disabled="!jobsStore.currentJobId">刷新当前任务</n-button>
                  <n-button block secondary @click="openJob(jobsStore.currentJobId)">打开任务详情</n-button>
                  <n-button block secondary @click="toggleCurrentJobSse" :disabled="!jobsStore.currentJobId">
                    {{ currentSseButtonText }}
                  </n-button>
                </n-space>
                <div class="text-xs mt-2">
                  <span class="opacity-70">实时连接：</span>
                  <span :class="currentSseColorClass">{{ currentSseLabel }}</span>
                </div>
              </div>

              <div class="rail-section rail-section--plain">
                <div class="flex items-center justify-between gap-2 mb-2">
                  <div class="text-xs opacity-70">任务日志（最近）</div>
                  <n-tag size="small" type="default">{{ currentSidebarLogs.length }}</n-tag>
                </div>
                <div class="rail-subpanel p-2 max-h-[220px] overflow-auto">
                  <template v-if="currentSidebarLogs.length">
                    <div
                      v-for="(log, idx) in currentSidebarLogs"
                      :key="`${idx}-${log.ts || ''}`"
                      class="py-1.5 border-b border-slate-200/50 dark:border-slate-700/40 last:border-b-0"
                    >
                      <div class="text-[11px] opacity-60">{{ log.ts || '--:--:--' }}</div>
                      <div class="text-xs leading-5 whitespace-pre-wrap break-words">{{ log.message }}</div>
                    </div>
                  </template>
                  <div v-else class="text-xs opacity-60 py-2">暂无日志，任务开始后会显示过程记录</div>
                </div>
              </div>

              <div class="rail-section rail-section--plain">
                <div class="flex items-center justify-between gap-2 mb-2">
                  <div class="text-xs opacity-70">Markdown 结果</div>
                  <n-tag size="small" :type="isCurrentJobCompleted ? 'success' : 'default'">
                    {{ isCurrentJobCompleted ? '可查看' : '未完成' }}
                  </n-tag>
                </div>

                <n-space size="small" class="mb-2">
                  <n-button
                    size="small"
                    @click="() => loadCurrentJobNoteAssets()"
                    :disabled="!isCurrentJobCompleted || loadingCurrentJobNote"
                    :loading="loadingCurrentJobNote"
                  >
                    加载 MD
                  </n-button>
                  <n-button
                    size="small"
                    tag="a"
                    :href="currentNoteDownloadUrl || undefined"
                    target="_blank"
                    :disabled="!currentNoteDownloadUrl"
                  >
                    下载 MD
                  </n-button>
                </n-space>

                <div v-if="currentNoteLink" class="text-[11px] opacity-60 mb-2 truncate" :title="currentNoteLink.file_name">
                  {{ currentNoteLink.file_name }}
                </div>

                <div class="rail-subpanel p-2 max-h-[180px] overflow-auto">
                  <template v-if="currentNoteTextPreview">
                    <pre class="text-xs leading-5 whitespace-pre-wrap break-words font-sans">{{ currentNoteTextPreview }}</pre>
                  </template>
                  <div v-else class="text-xs opacity-60 py-2">
                    {{ isCurrentJobCompleted ? '任务已完成，点击“加载 MD”查看内容。' : '任务完成后可在这里预览并下载 Markdown 笔记。' }}
                  </div>
                </div>
              </div>
            </div>
          </template>
          <n-empty v-else description="先在中间聊天；开启“知识检索”并发送后，才可能创建任务" />
        </n-card>
      </n-gi>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NCard, NEmpty, NGi, NGrid, NIcon, NInput, NSelect, NSpace, NTag, useMessage } from 'naive-ui'
import { ArrowUpOutline } from '@vicons/ionicons5'
import { useJobsStore } from '@/stores/modules/useJobsStore'
import { useAuthStore } from '@/stores/modules/useAuthStore'
import { useGlobalStore } from '@/stores/global-store'
import { createChatSessionApi, listChatModelsApi, sendChatMessageApi } from '@/api/chat'
import { buildJobNoteDownloadUrl } from '@/api/jobs'
import type { ChatMessage, ChatModelItem, JobCreateResponse } from '@/api/types'

type UiChatMessage = {
  localId: string
  role: 'user' | 'assistant'
  content: string
  pending?: boolean
  task?: JobCreateResponse | null
  toolDecisionReason?: string
}

const router = useRouter()
const route = useRoute()
const message = useMessage()
const jobsStore = useJobsStore()
const authStore = useAuthStore()
const globalStore = useGlobalStore()

const CHAT_MODEL_STORAGE_KEY = 'robot_web_selected_chat_model'

const userInput = ref('')
const messages = ref<UiChatMessage[]>([])
const sending = ref(false)
const knowledgeRetrievalEnabled = ref(false)
const chatSessionUuid = ref('')
const chatModels = ref<ChatModelItem[]>([])
const selectedModel = ref<string | null>(null)
const modelsLoading = ref(false)
const messagesContainerRef = ref<HTMLElement | null>(null)
const routeNewChatToken = ref<string>('')

const currentJobState = computed(() => (jobsStore.currentJobId ? jobsStore.jobs[jobsStore.currentJobId] : null))
const currentSnapshot = computed(() => currentJobState.value?.snapshot || null)
const currentUserLabel = computed(() => authStore.user?.display_name || authStore.user?.username || '你')
const loadingCurrentJobNote = ref(false)

const currentSseButtonText = computed(() => {
  const s = currentJobState.value?.sseStatus
  return s === 'connected' ? '暂停实时连接' : '开启实时连接'
})

const currentSseLabel = computed(() => {
  const s = currentJobState.value?.sseStatus || 'idle'
  if (s === 'connected') return '已连接'
  if (s === 'connecting') return '连接中'
  if (s === 'disconnected') return '已断开'
  return '未开启'
})

const currentSseColorClass = computed(() => {
  const s = currentJobState.value?.sseStatus || 'idle'
  if (s === 'connected') return 'text-green-500 font-medium'
  if (s === 'connecting') return 'text-blue-500 font-medium'
  if (s === 'disconnected') return 'text-red-500 font-medium'
  return 'opacity-70'
})

const modelOptions = computed(() =>
  chatModels.value.map((m) => ({
    label: `${m.display_name || m.model_name}${m.provider ? ` · ${m.provider}` : ''}`,
    value: m.model_name,
  })),
)

const currentSidebarLogs = computed(() => {
  const logs = currentJobState.value?.logs || []
  return logs.slice(-40).map((x) => ({
    ts: x.ts,
    message: humanizeSidebarLog(x.message || ''),
  }))
})

const isCurrentJobCompleted = computed(() => currentSnapshot.value?.status === 'completed')
const currentNoteText = computed(() => currentJobState.value?.noteText || '')
const currentNoteLink = computed(() => currentJobState.value?.noteLink || null)
const currentNoteTextPreview = computed(() => (currentNoteText.value || '').slice(0, 4000))
const currentNoteDownloadUrl = computed(() => {
  if (!jobsStore.currentJobId || !currentNoteLink.value) return ''
  return buildJobNoteDownloadUrl(jobsStore.currentJobId)
})

onMounted(async () => {
  globalStore.setBreadcrumbBarVisible(false)

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(CHAT_MODEL_STORAGE_KEY)
    if (cached) selectedModel.value = cached
  }

  await Promise.allSettled([bootstrapCurrentJob(), loadChatModels()])
  handleNewChatRouteSignal(String(route.query.newChat || ''))
})

watch(selectedModel, (val) => {
  if (typeof window === 'undefined') return
  if (!val) localStorage.removeItem(CHAT_MODEL_STORAGE_KEY)
  else localStorage.setItem(CHAT_MODEL_STORAGE_KEY, val)
})

watch(
  () => route.query.newChat,
  (val) => {
    handleNewChatRouteSignal(String(val || ''))
  },
)

watch(
  messages,
  async () => {
    await nextTick()
    const el = messagesContainerRef.value
    if (el) el.scrollTop = el.scrollHeight
  },
  { deep: true },
)

watch(
  () => [jobsStore.currentJobId, currentSnapshot.value?.status] as const,
  async ([jobId, status]) => {
    if (!jobId || status !== 'completed') return
    if (currentNoteText.value && currentNoteLink.value) return
    await loadCurrentJobNoteAssets({ silent: true })
  },
)

async function bootstrapCurrentJob() {
  if (jobsStore.currentJobId && !currentSnapshot.value) {
    try {
      await jobsStore.fetchJob(jobsStore.currentJobId)
    } catch {
      // ignore bootstrap errors
    }
  }
}

async function loadChatModels() {
  modelsLoading.value = true
  try {
    const res = await listChatModelsApi()
    chatModels.value = res.items || []
    if (!selectedModel.value && chatModels.value.length > 0) {
      const firstModel = chatModels.value[0]
      if (firstModel) selectedModel.value = firstModel.model_name
    }
  } catch {
    chatModels.value = []
  } finally {
    modelsLoading.value = false
  }
}

function handleNewChatRouteSignal(token: string) {
  if (!token || token === routeNewChatToken.value) return
  routeNewChatToken.value = token
  startNewConversation()
}

function startNewConversation() {
  chatSessionUuid.value = ''
  messages.value = []
  userInput.value = ''
  knowledgeRetrievalEnabled.value = false
}

async function ensureChatSession() {
  if (chatSessionUuid.value) return chatSessionUuid.value
  const title = messages.value.find((m) => m.role === 'user')?.content || ''
  const res = await createChatSessionApi(title)
  chatSessionUuid.value = res.session.session_uuid
  return chatSessionUuid.value
}

function appendUiMessage(payload: Partial<UiChatMessage> & Pick<UiChatMessage, 'role' | 'content'>) {
  const item: UiChatMessage = {
    localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: payload.role,
    content: payload.content,
    pending: payload.pending,
    task: payload.task ?? null,
    toolDecisionReason: payload.toolDecisionReason,
  }
  messages.value.push(item)
  return item
}

function mapAssistantMessage(msg: ChatMessage, task: JobCreateResponse | null, toolDecision?: { reason?: string }) {
  return appendUiMessage({
    role: 'assistant',
    content: String(msg?.content || '我已收到。'),
    task: task ?? (msg?.meta?.task as JobCreateResponse | null) ?? null,
    toolDecisionReason:
      String(toolDecision?.reason || msg?.meta?.tool_decision?.reason || '').trim() || undefined,
  })
}

async function sendMessage() {
  const text = userInput.value.trim()
  if (!text) {
    message.warning('请输入内容')
    return
  }
  if (sending.value) return

  appendUiMessage({ role: 'user', content: text })
  userInput.value = ''
  const pendingAssistant = appendUiMessage({ role: 'assistant', content: '', pending: true })
  sending.value = true

  try {
    const sessionUuid = await ensureChatSession()
    const res = await sendChatMessageApi(sessionUuid, {
      content: text,
      model_name: selectedModel.value || '',
      auto_task: knowledgeRetrievalEnabled.value,
    })

    const idx = messages.value.findIndex((m) => m.localId === pendingAssistant.localId)
    if (idx >= 0) messages.value.splice(idx, 1)
    mapAssistantMessage(res.assistant_message, res.task, res.tool_decision)

    if (res.task?.job_id) {
      jobsStore.setCurrentJob(res.task.job_id)
      try {
        await jobsStore.fetchJob(res.task.job_id)
      } catch {
        // ignore
      }
      jobsStore.connectJobEvents(res.task.job_id)
      message.success('已创建任务，并保留在当前对话页继续聊天')
    } else if (knowledgeRetrievalEnabled.value && res.tool_decision && !res.tool_decision.should_create_job) {
      message.info('本次未创建任务：AI 判断为普通对话/咨询')
    }
  } catch (e: any) {
    const idx = messages.value.findIndex((m) => m.localId === pendingAssistant.localId)
    if (idx >= 0) {
      messages.value.splice(idx, 1, {
        ...pendingAssistant,
        pending: false,
        content: `发送失败：${e?.message || '未知错误'}`,
      })
    }
    message.error(e?.message || '发送失败')
  } finally {
    sending.value = false
  }
}

async function refreshCurrentJob() {
  if (!jobsStore.currentJobId) return
  try {
    await jobsStore.fetchJob(jobsStore.currentJobId)
    if (currentSnapshot.value?.status === 'completed') {
      await loadCurrentJobNoteAssets({ silent: true })
    }
    message.success('已刷新当前任务')
  } catch (e: any) {
    message.error(e?.message || '刷新失败')
  }
}

function toggleCurrentJobSse() {
  if (!jobsStore.currentJobId) return
  const s = currentJobState.value?.sseStatus
  if (s === 'connected') {
    jobsStore.disconnectJobEvents(jobsStore.currentJobId)
  } else {
    jobsStore.connectJobEvents(jobsStore.currentJobId)
  }
}

function openJob(id: string) {
  router.push(`/jobs/${id}`)
}

function clearInput() {
  userInput.value = ''
}

async function loadCurrentJobNoteAssets(options?: { silent?: boolean }) {
  const jobId = jobsStore.currentJobId
  if (!jobId || !isCurrentJobCompleted.value) return
  if (loadingCurrentJobNote.value) return
  loadingCurrentJobNote.value = true
  try {
    if (!currentNoteLink.value) {
      await jobsStore.fetchNoteLink(jobId)
    }
    if (!currentNoteText.value) {
      await jobsStore.fetchNote(jobId)
    }
    if (!options?.silent) message.success('已加载 Markdown 结果')
  } catch (e: any) {
    if (!options?.silent) message.error(e?.message || '加载 Markdown 失败')
  } finally {
    loadingCurrentJobNote.value = false
  }
}

function handleEnterSend(e: KeyboardEvent) {
  if (e.shiftKey) return
  sendMessage()
}

function tagType(status?: string) {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'running') return 'success'
  if (status === 'queued') return 'info'
  return 'default'
}

function statusLabel(status?: string) {
  if (status === 'completed') return '已完成'
  if (status === 'failed') return '失败'
  if (status === 'running') return '运行中'
  if (status === 'queued') return '排队中'
  return status || '未开始'
}

function humanizeStage(stage: string) {
  const s = (stage || '').trim()
  if (!s) return ''
  if (s.includes('search_round_')) return 'AI 正在检索并筛选视频'
  if (s === 'run_selected_video_pipelines') return '正在处理选中的视频'
  if (s === 'merge_multi_notes') return 'AI 正在合并多份笔记'
  if (s === 'extract_audio_url') return '正在提取音频链接'
  if (s === 'download_audio') return '正在下载音频'
  if (s === 'transcribe') return '正在语音转文字'
  if (s === 'generate_note') return 'AI 正在生成笔记'
  if (s.includes('failed')) return '任务执行失败'
  return s
}

function humanizeSidebarLog(text: string) {
  const t = (text || '').trim()
  if (!t) return ''
  if (t.includes('任务已创建')) return '任务已创建，等待执行'
  return t
}
</script>

<style scoped>
.composer-shell {
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

:global(.dark) .composer-shell {
  background: rgba(17, 24, 39, 0.55);
  border-color: rgba(148, 163, 184, 0.16);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
}

.knowledge-toggle {
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 26px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #fff;
  color: #1f2937;
  transition: all 0.2s ease;
}

.knowledge-toggle:hover {
  border-color: rgba(59, 130, 246, 0.45);
}

.knowledge-toggle--active {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

:global(.dark) .knowledge-toggle {
  background: rgba(31, 41, 55, 0.95);
  color: #e5e7eb;
  border-color: rgba(148, 163, 184, 0.25);
}

:deep(.right-rail-card > .n-card__content) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.rail-section {
  position: relative;
  border-radius: 14px;
  padding: 12px;
  border: 1px solid rgba(203, 213, 225, 0.72);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.86));
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.035);
  --rail-accent: rgba(148, 163, 184, 0.45);
}

.rail-section::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  border-radius: 14px 0 0 14px;
  background: var(--rail-accent);
}

.rail-section--meta {
  --rail-accent: rgba(148, 163, 184, 0.55);
}

.rail-section--stage {
  --rail-accent: rgba(59, 130, 246, 0.38);
}

.rail-section--actions {
  --rail-accent: rgba(100, 116, 139, 0.38);
}

.rail-section--plain {
  --rail-accent: rgba(148, 163, 184, 0.34);
}

.rail-subpanel {
  border-radius: 10px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: rgba(255, 255, 255, 0.66);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
}

:global(.dark) .rail-section {
  border-color: rgba(71, 85, 105, 0.66);
  background:
    linear-gradient(180deg, rgba(30, 41, 59, 0.58), rgba(15, 23, 42, 0.46));
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.22);
}

:global(.dark) .rail-section--meta {
  --rail-accent: rgba(148, 163, 184, 0.38);
}

:global(.dark) .rail-section--stage {
  --rail-accent: rgba(96, 165, 250, 0.34);
}

:global(.dark) .rail-section--actions {
  --rail-accent: rgba(148, 163, 184, 0.26);
}

:global(.dark) .rail-section--plain {
  --rail-accent: rgba(148, 163, 184, 0.22);
}

:global(.dark) .rail-subpanel {
  border-color: rgba(71, 85, 105, 0.6);
  background: rgba(15, 23, 42, 0.34);
  box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.03);
}

.send-icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(203, 213, 225, 0.9);
  background: #fff;
  color: #0f172a;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
  transition: all 0.18s ease;
}

.send-icon-btn:hover:not(:disabled) {
  border-color: rgba(59, 130, 246, 0.35);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
  transform: translateY(-1px);
}

.send-icon-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

:global(.dark) .send-icon-btn {
  background: rgba(17, 24, 39, 0.96);
  color: #f8fafc;
  border-color: rgba(107, 114, 128, 0.65);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.32);
}

.send-icon-spinner {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  border: 2px solid rgba(148, 163, 184, 0.35);
  border-top-color: currentColor;
  animation: send-spin 0.8s linear infinite;
}

@keyframes send-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.message-bubble {
  border: 1px solid transparent;
}

.message-assistant {
  background: rgba(248, 250, 252, 0.95);
  border-color: rgba(203, 213, 225, 0.65);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
}

.message-user {
  background: #fff;
  border-color: rgba(203, 213, 225, 0.9);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
}

:global(.dark) .message-assistant {
  background: rgba(31, 41, 55, 0.92);
  border-color: rgba(75, 85, 99, 0.9);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.28);
}

:global(.dark) .message-user {
  background: rgba(17, 24, 39, 0.96);
  border-color: rgba(107, 114, 128, 0.65);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
}

.ai-avatar {
  background: rgba(15, 23, 42, 0.08);
  border: 1px solid rgba(148, 163, 184, 0.35);
}

.user-avatar {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

:global(.dark) .ai-avatar {
  background: rgba(148, 163, 184, 0.1);
  border-color: rgba(148, 163, 184, 0.25);
}

:global(.dark) .user-avatar {
  background: rgba(59, 130, 246, 0.16);
  color: #93c5fd;
  border-color: rgba(59, 130, 246, 0.26);
}

:deep(.chat-composer-input .n-input-wrapper) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

:deep(.chat-composer-input .n-input__textarea-el) {
  padding-left: 2px;
  padding-right: 2px;
}

:deep(.chat-composer-input .n-input__border),
:deep(.chat-composer-input .n-input__state-border) {
  display: none !important;
}
</style>
