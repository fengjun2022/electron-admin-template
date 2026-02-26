<template>
  <div class="p-4 h-full overflow-auto">
    <n-space vertical size="large">
      <n-card title="AI 检索与转笔记任务" :bordered="false">
        <n-space vertical>
          <n-alert type="info" :show-icon="false">
            当前后端地址：{{ authStore.apiBaseUrl || '未设置' }}
          </n-alert>

          <n-input
            v-model:value="userInput"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 6 }"
            placeholder="输入 B站链接，或输入主题问题（例如：什么是LLM / 王者荣耀各装备作用盘点）"
          />

          <n-collapse>
            <n-collapse-item title="高级参数" name="advanced">
              <n-grid :cols="2" x-gap="12" y-gap="12">
                <n-gi>
                  <n-form-item label="目标视频数">
                    <n-input-number v-model:value="form.topic_target_videos" :min="1" :max="8" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="最大检索轮次">
                    <n-input-number v-model:value="form.topic_max_search_rounds" :min="1" :max="6" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="每轮候选数">
                    <n-input-number v-model:value="form.search_limit" :min="3" :max="30" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="搜索页数">
                    <n-input-number v-model:value="form.search_pages" :min="1" :max="5" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="搜索超时(秒)">
                    <n-input-number v-model:value="form.search_timeout" :min="10" :max="120" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="滚动轮次">
                    <n-input-number v-model:value="form.search_scroll_rounds" :min="0" :max="8" />
                  </n-form-item>
                </n-gi>
              </n-grid>

              <n-space>
                <n-checkbox v-model:checked="form.keep_intermediate_audio">保留中间音频</n-checkbox>
                <n-checkbox v-model:checked="form.playwright_headless">Playwright 无头</n-checkbox>
                <n-checkbox v-model:checked="form.search_headless">搜索无头</n-checkbox>
              </n-space>
            </n-collapse-item>
          </n-collapse>

          <n-space justify="space-between">
            <n-button @click="goPromptStudio" quaternary>打开 Prompt 设置</n-button>
            <n-space>
              <n-button @click="refreshCurrentJob" :disabled="!jobsStore.currentJobId">刷新当前任务</n-button>
              <n-button type="primary" :loading="jobsStore.creating" @click="submitTask">
                开始执行任务
              </n-button>
            </n-space>
          </n-space>
        </n-space>
      </n-card>

      <n-card title="最近任务" :bordered="false">
        <template v-if="jobsStore.recentJobIds.length">
          <n-list hoverable clickable>
            <n-list-item v-for="id in jobsStore.recentJobIds" :key="id" @click="openJob(id)">
              <n-space justify="space-between" class="w-full">
                <div class="font-mono text-xs">{{ id }}</div>
                <n-tag size="small" :type="tagType(jobsStore.jobs[id]?.snapshot?.status)">
                  {{ jobsStore.jobs[id]?.snapshot?.status || 'unknown' }}
                </n-tag>
              </n-space>
              <div class="text-xs opacity-70 mt-1 truncate">
                {{ jobsStore.jobs[id]?.snapshot?.user_input || '未加载任务详情' }}
              </div>
            </n-list-item>
          </n-list>
        </template>
        <n-empty v-else description="还没有任务记录" />
      </n-card>
    </n-space>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NCard,
  NCheckbox,
  NCollapse,
  NCollapseItem,
  NEmpty,
  NFormItem,
  NGi,
  NGrid,
  NInput,
  NInputNumber,
  NList,
  NListItem,
  NSpace,
  NTag,
  useMessage,
} from 'naive-ui'
import { useJobsStore } from '@/stores/modules/useJobsStore'
import { useAuthStore } from '@/stores/modules/useAuthStore'

const router = useRouter()
const message = useMessage()
const jobsStore = useJobsStore()
const authStore = useAuthStore()

const userInput = ref('')
const form = reactive({
  search_limit: 12,
  search_timeout: 30,
  search_pages: 2,
  search_scroll_rounds: 2,
  topic_target_videos: 3,
  topic_max_search_rounds: 3,
  keep_intermediate_audio: false,
  playwright_headless: true,
  search_headless: true,
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
      ...form,
    })
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

function openJob(id: string) {
  router.push(`/jobs/${id}`)
}

function goPromptStudio() {
  router.push('/prompt-studio')
}

function tagType(status?: string) {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'running') return 'warning'
  return 'default'
}
</script>
