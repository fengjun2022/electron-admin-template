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
        <NDrawer v-model:show="showSettingsDrawer" :width="320" placement="right">
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
import { NConfigProvider, NMessageProvider, NDrawer, NDrawerContent, NSwitch, darkTheme } from 'naive-ui'

import { AddOutline, SettingsOutline, FolderOpenOutline } from '@vicons/ionicons5'

import { useGlobalStore } from '@/stores/global-store'
import { getThemeColors } from '@/config/theme'

// 导入布局组件
import AppHeader from './components/AppHeader.vue'
import AppSidebar from './components/AppSidebar.vue'
import AppMain from './components/AppMain.vue'
import ChatSiderBar from '@/layouts/components/ChatSiderBar.vue'

const globalStore = useGlobalStore()
const { isHeaderVisible, isBreadcrumbBarVisible, isDarkMode, showSettingsDrawer } = storeToRefs(globalStore)

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
      // 这里可以切路由或重置会话
    },
  },
  {
    key: 'open-folder',
    label: '打开文件夹',
    icon: markRaw(SettingsOutline),
    cb: () => {
      // 业务处理...
    },
  },
  {
    key: 'settings',
    label: '设置',
    icon: markRaw(FolderOpenOutline),
    cb: () => {
      showSettingsDrawer.value = true
    },
  },
])

// 历史记录（供侧边栏展示）
const historyRecords = ref<HistoryRecord[]>([
  { id: 'r1', title: '和客户A的会议纪要', subtitle: '2025-09-01 14:30' },
  { id: 'r2', title: '需求澄清：胸痛中心项目', subtitle: '2025-09-03 10:00' },
  { id: 'r3', title: 'Bugfix 备忘', subtitle: '2025-09-05 21:10' },
  { id: 'r3', title: '测试数据请在AppLayout中删除', subtitle: '2025-09-05 21:10' },
])

const activeHistoryTitle = computed(() => historyRecords.value.find((r) => r.active)?.title)

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
  title: string
  subtitle?: string
  active?: boolean
  data?: unknown
}

// 点击历史记录
function onHistoryClick(record: HistoryRecord) {
  historyRecords.value = historyRecords.value.map((r) => ({
    ...r,
    active: r.id === record.id,
  }))
  // 先清除其他 active，再标记当前
  console.log(record)
  // 你的业务：比如跳转、加载会话...
}

// 删除历史记录
function onHistoryDelete(record: HistoryRecord) {
  historyRecords.value = historyRecords.value.filter((r) => r.id !== record.id)
}
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
}
</style>
