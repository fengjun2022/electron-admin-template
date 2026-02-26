<template>
  <NConfigProvider :theme="isDarkMode ? darkTheme : null">
    <NMessageProvider>
      <div
        class="app-layout h-screen flex flex-col transition-colors duration-300"
        :style="{ backgroundColor: themeColors.main }"
      >
        <!-- 头部导航 -->
        <AppHeader @open-settings="showSettingsDrawer = true" />

        <!-- 主体内容区域 - flex布局 -->
        <div class="flex flex-1 overflow-hidden">
          <!-- 侧边栏 -->
          <AppSidebar v-show="globalStore.adminOrChat" @open-settings="showSettingsDrawer = true" />
          <ChatSiderBar
            v-show="!globalStore.adminOrChat"
            class="shrink-0"
            :fixed-items="fixedItems"
            :history-records="historyRecords"
            @open-settings="showSettingsDrawer = true"
            @history-click="onHistoryClick"
            @history-delete="onHistoryDelete"
          />

          <!-- 主内容区域 -->
          <AppMain />
        </div>

<!--         设置抽屉-->
        <NDrawer v-model:show="showSettingsDrawer" :width="360" placement="right">
          <NDrawerContent
            title="设置"
            :body-style="{
              padding: '24px',
              backgroundColor: themeColors.component,
            }"
            :header-style="{
              backgroundColor: themeColors.component,
            }"
          >
            <div class="space-y-6">
              <div class="flex items-center justify-between">
                <span class="text-base font-medium" :style="{ color: themeColors.text }">显示头部</span>
                <NSwitch v-model:value="isHeaderVisible" @update:value="globalStore.setHeaderVisible" />
              </div>

              <div class="flex items-center justify-between">
                <span class="text-base font-medium" :style="{ color: themeColors.text }">显示面包屑导航</span>
                <NSwitch v-model:value="isBreadcrumbBarVisible" @update:value="globalStore.setBreadcrumbBarVisible" />
              </div>

              <NDivider />

              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-base font-medium" :style="{ color: themeColors.text }">对话参数</span>
                  <NTag size="small" type="info">默认参数</NTag>
                </div>
                <div class="text-xs mb-3" :style="{ color: themeColors.textSecondary }">
                  用于“超级小智”发起任务时的默认检索与处理参数（原高级参数）。
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <div class="text-xs mb-1" :style="{ color: themeColors.textSecondary }">目标视频数</div>
                    <NInputNumber v-model:value="chatTaskParams.topic_target_videos" :min="1" :max="8" class="w-full" />
                  </div>
                  <div>
                    <div class="text-xs mb-1" :style="{ color: themeColors.textSecondary }">最大检索轮次</div>
                    <NInputNumber v-model:value="chatTaskParams.topic_max_search_rounds" :min="1" :max="6" class="w-full" />
                  </div>
                  <div>
                    <div class="text-xs mb-1" :style="{ color: themeColors.textSecondary }">每轮候选数</div>
                    <NInputNumber v-model:value="chatTaskParams.search_limit" :min="3" :max="30" class="w-full" />
                  </div>
                  <div>
                    <div class="text-xs mb-1" :style="{ color: themeColors.textSecondary }">搜索页数</div>
                    <NInputNumber v-model:value="chatTaskParams.search_pages" :min="1" :max="5" class="w-full" />
                  </div>
                  <div>
                    <div class="text-xs mb-1" :style="{ color: themeColors.textSecondary }">搜索超时(秒)</div>
                    <NInputNumber v-model:value="chatTaskParams.search_timeout" :min="10" :max="180" class="w-full" />
                  </div>
                  <div>
                    <div class="text-xs mb-1" :style="{ color: themeColors.textSecondary }">滚动轮次</div>
                    <NInputNumber v-model:value="chatTaskParams.search_scroll_rounds" :min="0" :max="8" class="w-full" />
                  </div>
                </div>

                <NSpace vertical size="small" class="mt-3">
                  <NCheckbox v-model:checked="chatTaskParams.keep_intermediate_audio">保留中间音频</NCheckbox>
                  <NCheckbox v-model:checked="chatTaskParams.playwright_headless">Playwright 无头</NCheckbox>
                  <NCheckbox v-model:checked="chatTaskParams.search_headless">搜索无头</NCheckbox>
                </NSpace>
              </div>

              <NDivider />

              <div class="flex items-center justify-between">
                <div>
                  <div class="text-base font-medium" :style="{ color: themeColors.text }">Prompt 设置</div>
                  <div class="text-xs" :style="{ color: themeColors.textSecondary }">笔记格式与风格要求</div>
                </div>
                <NButton size="small" @click="openPromptStudioFromDrawer">打开</NButton>
              </div>
            </div>
          </NDrawerContent>
        </NDrawer>
      </div>
    </NMessageProvider>
  </NConfigProvider>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, markRaw } from 'vue'
import { storeToRefs } from 'pinia'
import {
  NConfigProvider,
  NMessageProvider,
  NDrawer,
  NDrawerContent,
  NSwitch,
  NInputNumber,
  NCheckbox,
  NSpace,
  NDivider,
  NButton,
  NTag,
  darkTheme,
} from 'naive-ui'

import { AddOutline, SettingsOutline } from '@vicons/ionicons5'
import { useRouter, useRoute } from 'vue-router'

import { useGlobalStore } from '@/stores/global-store'
import { getThemeColors } from '@/config/theme'
import { useJobsStore } from '@/stores/modules/useJobsStore'
import { useChatStore } from '@/stores/modules/useChatStore'

// 导入布局组件
import AppHeader from './components/AppHeader.vue'
import AppSidebar from './components/AppSidebar.vue'
import AppMain from './components/AppMain.vue'
import ChatSiderBar from '@/layouts/components/ChatSiderBar.vue'

const globalStore = useGlobalStore()
const { isHeaderVisible, isBreadcrumbBarVisible, isDarkMode, showSettingsDrawer, chatTaskParams } = storeToRefs(globalStore)
const jobsStore = useJobsStore()
const chatStore = useChatStore()
const router = useRouter()
const route = useRoute()

// 计算当前主题颜色
const themeColors = computed(() => {
  return getThemeColors(isDarkMode.value ? 'dark' : 'light')
})

const isMobile = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
  if (isMobile.value) {
    globalStore.isSidebarMinimized = true
  }
}

onMounted(() => {
  checkMobile()
  void chatStore.refreshSessions().catch(() => undefined)
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

// 固定功能项（父组件定义 item.cb 的具体行为）
const fixedItems = ref<FixedItem[]>([
  {
    key: 'new-chat',
    label: '新对话',
    icon: markRaw(AddOutline),
    cb: () => {
      router.push({ path: '/home', query: { newChat: String(Date.now()) } })
    },
  },
  {
    key: 'settings',
    label: '设置',
    icon: markRaw(SettingsOutline),
    cb: () => {
      showSettingsDrawer.value = true
    },
  },
])

// 历史记录（聊天会话 + 任务）
const historyRecords = computed<HistoryRecord[]>(() => {
  const chatRecords = chatStore.sessions.map((s) => ({
    id: s.session_uuid,
    type: 'chat' as const,
    title: String(s.title || '新对话'),
    subtitle: '聊天会话',
    active:
      route.path === '/home' &&
      String(route.query.session || '') === s.session_uuid,
    data: s,
    sortTs: Date.parse(String(s.last_message_at || s.updated_at || s.created_at || '')) || 0,
  }))
  const jobRecords = jobsStore.recentJobIds.map((id) => {
    const snap = jobsStore.jobs[id]?.snapshot
    const stage = humanizeStage(String(snap?.stage || ''))
    return {
      id,
      type: 'job' as const,
      title: snap?.user_input || '点击查看任务详情',
      subtitle: stage || statusLabel(String(snap?.status || '')),
      active: route.path === `/jobs/${id}` || jobsStore.currentJobId === id,
      data: snap,
      sortTs: Date.parse(String(snap?.updated_at || snap?.created_at || '')) || 0,
    }
  })
  return [...chatRecords, ...jobRecords]
    .sort((a, b) => (b.sortTs || 0) - (a.sortTs || 0))
    .slice(0, 50)
})

// 和子组件里的类型保持一致（可复制或抽到一个 shared types 文件里复用）
interface FixedItem {
  key: string
  label: string
  icon: any
  active?: boolean
  cb: (item: any) => void
}
interface HistoryRecord {
  id: string
  type?: 'chat' | 'job'
  title: string
  subtitle?: string
  active?: boolean
  data?: unknown
  sortTs?: number
}

// 点击历史记录
function onHistoryClick(record: HistoryRecord) {
  if (record.type === 'chat') {
    chatStore.setCurrentSession(record.id)
    router.push({ path: '/home', query: { session: record.id } })
    return
  }
  jobsStore.setCurrentJob(record.id)
  const sourceSession = chatStore.getJobSourceSession(record.id)
  if (sourceSession) {
    router.push({ path: `/jobs/${record.id}`, query: { from: 'chat', session: sourceSession } })
    return
  }
  router.push(`/jobs/${record.id}`)
}

// 删除历史记录
async function onHistoryDelete(record: HistoryRecord) {
  const ok = typeof window === 'undefined' ? true : window.confirm('确定删除这条历史任务记录吗？')
  if (!ok) return
  if (record.type === 'chat') {
    await chatStore.deleteSession(record.id)
    if (route.path === '/home' && String(route.query.session || '') === record.id) {
      router.push({ path: '/home', query: { newChat: String(Date.now()) } })
    }
    return
  }
  await jobsStore.deleteJob(record.id)
}

function statusLabel(status?: string) {
  if (status === 'completed') return '已完成'
  if (status === 'failed') return '失败'
  if (status === 'running') return '运行中'
  if (status === 'queued') return '排队中'
  return '未开始'
}

function humanizeStage(stage: string) {
  const s = (stage || '').trim()
  if (!s) return ''
  if (s.includes('search_round_')) return 'AI 检索与筛选中'
  if (s === 'run_selected_video_pipelines') return '处理选中视频中'
  if (s === 'extract_audio_url') return '提取音频链接'
  if (s === 'download_audio') return '下载音频'
  if (s === 'transcribe') return 'AI 转写语音'
  if (s === 'generate_note') return 'AI 生成笔记'
  if (s === 'merge_multi_notes') return 'AI 合并多份笔记'
  if (s.includes('failed')) return '任务失败'
  return s
}

function openPromptStudioFromDrawer() {
  showSettingsDrawer.value = false
  router.push('/prompt-studio')
}
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
}
</style>
