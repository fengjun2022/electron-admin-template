<template>
  <div class="p-2 h-full overflow-hidden">
    <n-grid :cols="24" x-gap="12" class="h-full">
      <n-gi :span="18" class="h-full">
        <n-card :bordered="false" class="h-full">
          <div class="h-full flex flex-col">
            <div class="flex-1 min-h-0 overflow-auto px-1 py-1 space-y-4">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <div class="text-lg font-semibold">超级小智</div>
                  <div class="text-xs opacity-70 mt-1">对话式发起任务（默认 AI 模式）</div>
                </div>
                <n-tag size="small" type="info">AI模式</n-tag>
              </div>


              <div v-if="userInput.trim()" class="flex justify-end">
                <div class="rounded-2xl border border-green-400/20 bg-green-500/10 p-4 max-w-[88%]">
                  <div class="text-xs opacity-70 mb-1">{{ currentUserLabel }}</div>
                  <div class="whitespace-pre-wrap break-words">{{ userInput }}</div>
                </div>
              </div>


            </div>

            <div class="pt-3">
              <div class="rounded-[24px] border border-white/10 bg-black/10 dark:bg-white/5 px-4 py-3 shadow-sm">
                <n-input
                  v-model:value="userInput"
                  type="textarea"
                  :autosize="{ minRows: 3, maxRows: 8 }"
                  class="chat-composer-input"
                  placeholder="像聊天一样输入：你想在 B 站找到什么视频 / 知识点 / 攻略，或直接粘贴 B站链接"
                  @keydown.enter.exact.prevent="handleEnterSend"
                />

                <div class="mt-3 flex items-center justify-between gap-3">
                  <div class="text-xs opacity-70">
                    主题模式（自动检索+筛选）/ 单链接模式（直接转写） · Enter发送 · Shift+Enter换行
                  </div>
                  <n-space>
                    <n-button @click="clearInput" quaternary>清空</n-button>
                    <n-button type="primary" :loading="jobsStore.creating" @click="submitTask">
                      开始执行任务
                    </n-button>
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
            <div class="space-y-3">
              <div class="rounded-xl p-3 bg-blue-500/10 border border-blue-400/20">
                <div class="text-xs opacity-70 mb-1">当前任务ID</div>
                <div class="font-mono text-xs break-all">{{ jobsStore.currentJobId }}</div>
              </div>

              <div class="rounded-xl p-3 bg-green-500/10 border border-green-400/20">
                <div class="text-xs opacity-70 mb-1">正在进行的步骤</div>
                <div class="font-medium">{{ humanizeStage(currentSnapshot?.stage || '') || '等待中' }}</div>
                <div class="text-xs opacity-70 mt-1">{{ currentSnapshot?.detail || '系统将自动更新' }}</div>
              </div>

              <div class="rounded-xl p-3 bg-red-500/10 border border-red-400/20">
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
            </div>
          </template>
          <n-empty v-else description="先在中间像聊天一样输入需求，再开始执行任务" />
        </n-card>
      </n-gi>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NCard, NEmpty, NGi, NGrid, NInput, NSpace, NTag, useMessage } from 'naive-ui'
import { useJobsStore } from '@/stores/modules/useJobsStore'
import { useAuthStore } from '@/stores/modules/useAuthStore'
import { useGlobalStore } from '@/stores/global-store'

const router = useRouter()
const message = useMessage()
const jobsStore = useJobsStore()
const authStore = useAuthStore()
const globalStore = useGlobalStore()

const userInput = ref('')

const currentJobState = computed(() => (jobsStore.currentJobId ? jobsStore.jobs[jobsStore.currentJobId] : null))
const currentSnapshot = computed(() => currentJobState.value?.snapshot || null)
const currentUserLabel = computed(() => authStore.user?.display_name || authStore.user?.username || '你')

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

onMounted(async () => {
  globalStore.setBreadcrumbBarVisible(false)
  if (jobsStore.currentJobId && !currentSnapshot.value) {
    try {
      await jobsStore.fetchJob(jobsStore.currentJobId)
    } catch {
      // ignore bootstrap errors
    }
  }
})

async function submitTask() {
  const text = userInput.value.trim()
  if (!text) {
    message.warning('请输入 B站链接或主题问题')
    return
  }
  try {
    const res = await jobsStore.createJob({
      user_input: text,
      ...globalStore.chatTaskParams,
    } as any)
    message.success('任务已创建，正在进入详情页')
    await router.push(`/jobs/${res.job_id}`)
  } catch (e: any) {
    message.error(e?.message || '创建任务失败')
  }
}

async function refreshCurrentJob() {
  if (!jobsStore.currentJobId) return
  try {
    await jobsStore.fetchJob(jobsStore.currentJobId)
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

function fillExample(text: string) {
  userInput.value = text
}

function handleEnterSend(e: KeyboardEvent) {
  if (e.shiftKey) return
  submitTask()
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
</script>

<style scoped>
:deep(.chat-composer-input .n-input-wrapper) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

:deep(.chat-composer-input .n-input__border),
:deep(.chat-composer-input .n-input__state-border) {
  display: none !important;
}
</style>
