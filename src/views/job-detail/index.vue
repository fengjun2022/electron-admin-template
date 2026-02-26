<template>
  <div class="p-4 h-full overflow-auto">
    <n-space vertical size="large">
      <n-card :title="`任务详情 · ${jobId}`" :bordered="false">
        <n-space justify="space-between" align="center">
          <n-space align="center">
            <n-tag :type="statusTagType(job?.status)">
              {{ job?.status || 'unknown' }}
            </n-tag>
            <n-text depth="3">{{ job?.kind || 'unknown' }}</n-text>
          </n-space>
          <n-space>
            <n-button @click="refreshJob" :loading="loadingJob">刷新</n-button>
            <n-button @click="toggleSse">{{ sseBtnText }}</n-button>
            <n-button @click="goHome" quaternary>返回任务中心</n-button>
          </n-space>
        </n-space>

        <n-divider />
        <n-space vertical size="small">
          <div><strong>输入：</strong>{{ job?.user_input || '-' }}</div>
          <div><strong>当前阶段：</strong>{{ job?.stage || '-' }}</div>
          <div><strong>阶段说明：</strong>{{ job?.detail || '-' }}</div>
          <div><strong>SSE：</strong>{{ jobState?.sseStatus || 'idle' }}</div>
          <div v-if="job?.error"><strong>错误：</strong><span class="text-red-500">{{ job.error }}</span></div>
        </n-space>
      </n-card>

      <n-grid :cols="2" x-gap="12" y-gap="12">
        <n-gi>
          <n-card title="AI 过程日志" :bordered="false">
            <template #header-extra>
              <n-tag size="small">{{ (jobState?.logs || []).length }} 条</n-tag>
            </template>
            <div class="h-[420px] overflow-auto rounded-md p-3 bg-black/10 dark:bg-white/5">
              <template v-if="jobState?.logs?.length">
                <div
                  v-for="(log, idx) in jobState.logs"
                  :key="idx"
                  class="text-xs font-mono leading-6 border-b border-black/5 dark:border-white/5 py-1"
                >
                  <span class="opacity-60 mr-2">{{ log.ts || '--:--:--' }}</span>
                  <span>{{ log.message }}</span>
                </div>
              </template>
              <n-empty v-else description="等待日志..." />
            </div>
          </n-card>
        </n-gi>

        <n-gi>
          <n-card title="任务结构化信息" :bordered="false">
            <n-tabs type="line" animated>
              <n-tab-pane name="summary" tab="快照">
                <pre class="text-xs whitespace-pre-wrap break-all">{{ prettyJob }}</pre>
              </n-tab-pane>
              <n-tab-pane name="videos" tab="视频处理">
                <template v-if="videoRuns.length">
                  <n-list bordered>
                    <n-list-item v-for="(v, idx) in videoRuns" :key="`${v.bili_url}-${idx}`">
                      <n-space vertical size="small" class="w-full">
                        <n-space justify="space-between">
                          <div class="font-medium truncate max-w-[420px]">{{ v.title || v.bili_url }}</div>
                          <n-tag size="small" :type="statusTagType(v.status)">{{ v.status }}</n-tag>
                        </n-space>
                        <div class="text-xs opacity-70 break-all">{{ v.bili_url }}</div>
                        <div v-if="v.pipeline_result?.note_md" class="text-xs opacity-70">
                          中间笔记：{{ v.pipeline_result.note_md }}
                        </div>
                        <div v-if="v.error" class="text-xs text-red-500">{{ v.error }}</div>
                      </n-space>
                    </n-list-item>
                  </n-list>
                </template>
                <n-empty v-else description="该任务暂无视频处理明细" />
              </n-tab-pane>
              <n-tab-pane name="events" tab="事件流">
                <div class="h-[320px] overflow-auto">
                  <pre class="text-xs whitespace-pre-wrap break-all">{{ prettyEvents }}</pre>
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

        <n-input
          v-model:value="noteTextLocal"
          type="textarea"
          readonly
          placeholder="任务完成后点击“加载笔记”查看内容"
          :autosize="{ minRows: 16, maxRows: 36 }"
        />
      </n-card>
    </n-space>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NButton,
  NCard,
  NDivider,
  NEmpty,
  NGi,
  NGrid,
  NInput,
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
import { buildJobNoteDownloadUrl } from '@/api/jobs'
import { getApiBaseUrl } from '@/api/client'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const jobsStore = useJobsStore()

const loadingJob = ref(false)
const loadingNote = ref(false)

const jobId = computed(() => String(route.params.jobId || ''))
const jobState = computed(() => jobsStore.jobs[jobId.value] || null)
const job = computed(() => jobState.value?.snapshot || null)
const noteLink = computed(() => jobState.value?.noteLink || null)

const isCompleted = computed(() => job.value?.status === 'completed')
const videoRuns = computed(() => {
  const result = job.value?.result as any
  return Array.isArray(result?.video_runs) ? result.video_runs : []
})

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

const sseBtnText = computed(() => (jobState.value?.sseStatus === 'connected' ? '断开SSE' : '连接SSE'))

async function refreshJob() {
  if (!jobId.value) return
  loadingJob.value = true
  try {
    const snap = await jobsStore.fetchJob(jobId.value)
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
  router.push('/home')
}

function statusTagType(status?: string) {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'running') return 'warning'
  return 'default'
}

async function bootstrap() {
  if (!jobId.value) return
  jobsStore.setCurrentJob(jobId.value)
  await refreshJob()
  if (job.value?.status === 'running' || job.value?.status === 'queued') {
    jobsStore.connectJobEvents(jobId.value)
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
