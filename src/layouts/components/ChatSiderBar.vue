<template>
  <aside
    class="app-sidebar backdrop-blur-md border-r transition-all duration-300 z-40 shadow-xl overflow-hidden flex-shrink-0"
    :style="{
      backgroundColor: themeColors.sidebar,
      borderColor: themeColors.sidebarBorder,
      width: isSidebarMinimized ? '64px' : '280px',
    }"
  >
    <div :class="[isSidebarMinimized && 'items-center']" class="flex flex-col h-full">
      <!-- 顶部条，仅展开时显示 -->
      <div
        :class="{
          'flex w-full items-center px-3 h-[30px] mt-2': true,
        }"
        :style="!isHeaderVisible ? { borderColor: themeColors.sidebarBorder } : {}"
        v-show="!isSidebarMinimized"
      >
        <div
          @click="goHome"
          class="flex cursor-pointer items-center justify-center w-[14px] h-[14px] flex-shrink-0"
          :style="{ color: themeColors.textSecondary }"
        >
          <Icon icon="simple-icons:openai" width="14" height="14" />
        </div>

        <n-button
          text
          @click="toggleSidebar"
          class="ml-auto transition-colors"
          :style="{ color: themeColors.textSecondary }"
          size="small"
        >
          <n-icon :component="MenuOutline" size="16" />
        </n-button>
      </div>

      <!-- 收起状态的顶部按钮 -->
      <div v-show="isSidebarMinimized" class="h-10 pt-1 w-full flex justify-center">
        <n-button
          quaternary
          @click="toggleSidebar"
          size="small"
          class="!w-10 !h-10 !p-0 rounded-[12px]"
          :style="{ color: themeColors.textSecondary }"
          :title="toggleSidebarTooltip"
        >
          <n-icon :component="MenuOutline" size="16" />
        </n-button>
      </div>

      <!-- 固定功能列表区域 -->
      <div
        class="px-1 pt-2 overflow-hidden overflow-y-auto"
        :style="{
          height: fixedItemsHeight + 'px',
          borderColor: themeColors.sidebarBorder,
          borderBottomWidth: !isSidebarMinimized ? '1px' : 0,
        }"
      >
        <div class="space-y-1">
          <div
            v-for="item in fixedItems"
            :key="item.key"
            @click="item.cb(item)"
            :title="isSidebarMinimized ? item.label : ''"
            :class="[
              'flex items-center rounded-xl min-w-0 cursor-pointer transition-colors duration-200',
              isSidebarMinimized ? 'w-10 h-10 justify-center gap-0' : 'px-4 py-3 gap-3',
            ]"
            :style="{
              backgroundColor: item.active ? themeColors.pressColor : 'transparent',
              color: item.active ? themeColors.primary : themeColors.textSecondary,
            }"
            @mouseenter="handleFixedItemHover(item, $event, true)"
            @mouseleave="handleFixedItemHover(item, $event, false)"
          >
            <!-- 图标 -->
            <div
              class="flex items-center justify-center shrink-0 will-change-transform"
              :class="isSidebarMinimized ? 'w-10 h-10' : 'w-4 h-4'"
            >
              <n-icon :component="item.icon" :size="16" class="shrink-0" />
            </div>

            <!-- 文本容器 -->
            <div
              class="grid min-w-0 overflow-hidden transition-[grid-template-columns] duration-200 ease-in-out flex-1"
              :class="isSidebarMinimized ? '[grid-template-columns:0fr]' : '[grid-template-columns:1fr]'"
            >
              <div
                class="min-w-0 flex items-center justify-between transition-[opacity,transform] duration-200 will-change-[opacity,transform]"
                :class="isSidebarMinimized ? 'opacity-0 -translate-x-2' : 'opacity-100 translate-x-0'"
              >
                <span class="block font-medium whitespace-nowrap text-ellipsis min-w-0">
                  {{ item.label }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 历史记录标题（仅展开时显示） -->
      <div v-show="!isSidebarMinimized" class="px-4 py-2 overflow-hidden overflow-y-auto">
        <span class="text-sm font-medium" :style="{ color: themeColors.textSecondary }">
          {{ historyTitle }}
        </span>
      </div>

      <!-- 历史记录列表（占满剩余高度，可滚动） -->
      <div class="flex-1 overflow-y-auto px-1 py-2">
        <div v-show="!isSidebarMinimized" class="space-y-1">
          <!-- 历史记录项 -->
          <div
            v-for="record in historyRecords"
            :key="record.id"
            @click="handleHistoryClick(record)"
            :title="isSidebarMinimized ? record.title : ''"
            :class="[
              'flex items-center rounded-xl min-w-0 cursor-pointer transition-colors duration-200 group',
              isSidebarMinimized ? 'w-10 h-10 justify-center gap-0' : 'px-3 py-2 gap-3',
            ]"
            :style="{
              backgroundColor: record.active ? themeColors.pressColor : 'transparent',
              color: themeColors.text,
            }"
            @mouseenter="handleHistoryHover(record, $event, true)"
            @mouseleave="handleHistoryHover(record, $event, false)"
          >
            <!-- 历史记录内容 -->
            <div
              class="grid min-w-0 overflow-hidden transition-[grid-template-columns] duration-200 ease-in-out flex-1"
              :class="isSidebarMinimized ? '[grid-template-columns:0fr]' : '[grid-template-columns:1fr]'"
            >
              <div
                class="min-w-0 flex items-center justify-between transition-[opacity,transform] duration-200 will-change-[opacity,transform]"
                :class="isSidebarMinimized ? 'opacity-0 -translate-x-2' : 'opacity-100 translate-x-0'"
              >
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-medium truncate">
                    {{ record.title }}
                  </div>
                  <div
                    v-if="record.subtitle"
                    class="text-xs truncate mt-0.5"
                    :style="{ color: themeColors.textSecondary }"
                  >
                    {{ record.subtitle }}
                  </div>
                </div>

                <!-- 删除按钮 -->
                <div
                  v-if="showDeleteButton"
                  class="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  @click.stop="handleHistoryDelete(record)"
                >
                  <n-button text size="tiny" class="!w-5 !h-5 !p-0" :style="{ color: themeColors.textSecondary }">
                    <n-icon :component="TrashOutline" :size="12" />
                  </n-button>
                </div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div
            v-if="historyRecords.length === 0 && !isSidebarMinimized"
            class="flex flex-col items-center justify-center py-8 px-4"
          >
            <n-icon :component="ChatboxOutline" :size="32" :style="{ color: themeColors.textSecondary }" class="mb-2" />
            <span class="text-sm" :style="{ color: themeColors.textSecondary }">
              {{ emptyMessage }}
            </span>
          </div>
        </div>
      </div>

      <!-- 底部用户头像区域 -->
      <div v-show="!isHeaderVisible" class="p-2 border-t w-full" :style="{ borderColor: themeColors.sidebarBorder }">
        <NDropdown
          :options="userDropdownOptions"
          trigger="click"
          placement="top-start"
          @select="handleUserAction"
          class="text-base py-2 min-w-[240px] rounded-[8px]"
        >
          <div
            :class="[
              'flex items-center rounded-xl min-w-0 cursor-pointer transition-colors duration-200',
              isSidebarMinimized ? 'py-2 gap-0 justify-center' : 'w-full px-3 py-2 gap-3',
            ]"
            @mouseenter="!isSidebarMinimized && (($event as any).target.style.backgroundColor = themeColors.hover)"
            @mouseleave="!isSidebarMinimized && (($event as any).target.style.backgroundColor = 'transparent')"
            :title="isSidebarMinimized ? `${userStore.userName}\uff5c${userStore.personalizedSignature}` : ''"
          >
            <!-- 头像 -->
            <img
              class="w-10 h-10 shrink-0 grow-0 rounded-full object-cover"
              src="@/assets/default/OIP.jpeg"
              alt="user avatar"
            />

            <!-- 用户信息文本 -->
            <div
              class="grid min-w-0 overflow-hidden transition-[grid-template-columns] duration-200 ease-in-out"
              :class="isSidebarMinimized ? '[grid-template-columns:0fr]' : '[grid-template-columns:1fr]'"
            >
              <div
                class="min-w-0 transition-[opacity,transform] duration-200 will-change-[opacity,transform]"
                :class="isSidebarMinimized ? 'opacity-0 -translate-x-2' : 'opacity-100 translate-x-0'"
              >
                <div class="font-medium text-[14px] truncate" :style="{ color: themeColors.text }">
                  {{ userStore.userName }}
                </div>
                <div class="text-[12px] leading-tight truncate" :style="{ color: themeColors.textSecondary }">
                  {{ userStore.personalizedSignature }}
                </div>
              </div>
            </div>
          </div>
        </NDropdown>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, defineProps, defineEmits } from 'vue'
import { NButton, NIcon, NDropdown } from 'naive-ui'
import { MenuOutline, ChatboxOutline, TrashOutline } from '@vicons/ionicons5'
import { useUserStore } from '@/stores/modules/useUserStore'

import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { getThemeColors } from '@/config/theme'
import { useGlobalStore } from '@/stores/global-store'
const globalStore = useGlobalStore()
const { isSidebarMinimized, isHeaderVisible, isDarkMode, userDropdownOptions } = storeToRefs(globalStore)
const userStore = useUserStore()
import { Icon } from '@iconify/vue'

interface FixedItem {
  key: string
  label: string
  icon: any
  active?: boolean
  /** 点击回调（可选）*/
  cb: (item: FixedItem, ev?: MouseEvent) => void
}

/** 单条历史记录 */
interface HistoryRecord {
  id: string
  title: string
  subtitle?: string
  active?: boolean
  data?: unknown
}

interface Props {
  /** 固定功能项配置 */
  fixedItems?: Readonly<FixedItem[]>
  /** 固定列表区域高度 */
  fixedItemsHeight?: number

  /** 历史记录配置 */
  historyRecords?: Readonly<HistoryRecord[]>
  historyTitle?: string
  historyIcon?: any
  showDeleteButton?: boolean
  emptyMessage?: string

  /** 提示文本 */
  toggleSidebarTooltip?: string
}

const props = withDefaults(defineProps<Props>(), {
  fixedItems: () => [],
  fixedItemsHeight: 180,

  historyRecords: () => [],
  historyTitle: '历史记录',
  historyIcon: () => ChatboxOutline as unknown as any,
  showDeleteButton: true,
  emptyMessage: '暂无历史记录',

  toggleSidebarTooltip: '展开侧边栏',
})

const router = useRouter()
const route = useRoute()
// 计算当前主题颜色
const themeColors = computed(() => {
  return getThemeColors(isDarkMode.value ? 'dark' : 'light')
})
// Props 定义
// Emits 定义
const emit = defineEmits(['fixed-item-click', 'history-click', 'history-delete', 'open-settings'])

// 切换侧边栏
const toggleSidebar = () => {
  globalStore.toggleSidebar()
}

const closeSidebar = () => {
  globalStore.isSidebarMinimized = true
}
// 回到首页
const goHome = () => {
  router.push({ path: '/' })
}
// 处理固定项点击

// 处理固定项hover
const handleFixedItemHover = (item: any, event: any, isEnter: any) => {
  if (isEnter) {
    event.target.style.backgroundColor = item.active ? themeColors.value.pressColor : themeColors.value.hover
  } else {
    event.target.style.backgroundColor = item.active ? themeColors.value.pressColor : 'transparent'
  }
}

// 处理历史记录点击
const handleHistoryClick = (record: any) => {
  // 先清除其他 active，再标记当前

  emit('history-click', record)
}

// 处理历史记录hover
const handleHistoryHover = (record: any, event: any, isEnter: any) => {
  if (isEnter) {
    event.target.style.backgroundColor = record.active ? themeColors.value.pressColor : themeColors.value.hover
  } else {
    event.target.style.backgroundColor = record.active ? themeColors.value.pressColor : 'transparent'
  }
}

// 处理历史记录删除
const handleHistoryDelete = (record: any) => {
  emit('history-delete', record)
}

// 处理用户操作
const handleUserAction = (key: any, data: any) => {
  data.cb()
}
</script>
