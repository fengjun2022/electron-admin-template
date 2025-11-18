<template>
  <!-- 侧边栏 -->
  <aside
    class="app-sidebar  rounded-r-[8px] backdrop-blur-md border-r transition-all duration-300 z-40 shadow-xl overflow-hidden flex-shrink-0"
    :style="{
      backgroundColor: themeColors.sidebar,
      borderColor: themeColors.sidebarBorder,
      width: isSidebarMinimized ? '64px' : '280px',
    }"
  >
    <div :class="[isSidebarMinimized && 'items-center']" class="flex flex-col  h-full">
      <!-- 顶部条，仅展开时显示 -->
      <div
        :class="{
          'flex w-full items-center px-3 h-[50px]': true,
          'border-b': !isHeaderVisible,
        }"
        class="justify-between flex"
        :style="!isHeaderVisible ? { borderColor: themeColors.sidebarBorder } : {}"
        v-show="!isSidebarMinimized"
      >
        <div
          @click="goHome"
          class="flex cursor-pointer items-center justify-center w-[14px] h-[14px] flex-shrink-0"
          :style="{ color: themeColors.textSecondary }"
        >
          <svg class="w-full h-full" viewBox="0 0 1024 1024" fill="currentColor">
            <path
              d="M387.264 479.68l-192 0c-52.928 0-96-43.072-96-96l0-192c0-52.928 43.072-96 96-96l192 0c52.928 0 96 43.072 96 96l0 192C483.264 436.64 440.192 479.68 387.264 479.68zM195.264 159.68c-17.632 0-32 14.368-32 32l0 192c0 17.632 14.368 32 32 32l192 0c17.632 0 32-14.368 32-32l0-192c0-17.632-14.368-32-32-32L195.264 159.68z"
            />
            <path
              d="M387.264 927.68l-192 0c-52.928 0-96-43.072-96-96l0-192c0-52.928 43.072-96 96-96l192 0c52.928 0 96 43.072 96 96l0 192C483.264 884.64 440.192 927.68 387.264 927.68zM195.264 607.68c-17.632 0-32 14.336-32 32l0 192c0 17.664 14.368 32 32 32l192 0c17.632 0 32-14.336 32-32l0-192c0-17.664-14.368-32-32-32L195.264 607.68z"
            />
            <path
              d="M832.128 479.68l-192 0c-52.928 0-96-43.072-96-96l0-192c0-52.928 43.072-96 96-96l192 0c52.928 0 96 43.072 96 96l0 192C928.128 436.64 885.056 479.68 832.128 479.68zM640.128 159.68c-17.664 0-32 14.368-32 32l0 192c0 17.632 14.336 32 32 32l192 0c17.664 0 32-14.368 32-32l0-192c0-17.632-14.336-32-32-32L640.128 159.68z"
            />
            <path
              d="M832.128 927.68l-192 0c-52.928 0-96-43.072-96-96l0-192c0-52.928 43.072-96 96-96l192 0c52.928 0 96 43.072 96 96l0 192C928.128 884.64 885.056 927.68 832.128 927.68zM640.128 607.68c-17.664 0-32 14.336-32 32l0 192c0 17.664 14.336 32 32 32l192 0c17.664 0 32-14.336 32-32l0-192c0-17.664-14.336-32-32-32L640.128 607.68z"
            />
          </svg>
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

      <div v-show="isSidebarMinimized" class="h-10 pt-1 w-full flex justify-center">
        <n-button
          quaternary
          @click="toggleSidebar"
          size="small"
          class="!w-10 !h-10 !p-0 rounded-[12px]"
          :style="{ color: themeColors.textSecondary }"
          title="展开侧边栏"
        >
          <n-icon :component="MenuOutline" size="16" />
        </n-button>
      </div>

      <!-- 菜单（占满剩余高度） -->
      <nav class="flex-1 pt-4 px-1 overflow-y-auto">
        <div class="space-y-1">
          <template v-for="item in menuOptions" :key="item.key">
            <!-- 父级菜单项 -->
            <div>
              <div
                @click="handleMenuClick(item)"
                :title="isSidebarMinimized ? item.label : ''"
                :class="[
                  'flex items-center rounded-xl min-w-0 cursor-pointer transition-colors duration-200',
                  isSidebarMinimized ? 'w-10 h-10 justify-center gap-0' : 'px-4 py-3 gap-3',
                ]"
                :style="{
                  backgroundColor: isMenuActive(item) ? themeColors.pressColor : 'transparent',
                  color: isMenuActive(item) ? themeColors.primary : themeColors.textSecondary,
                }"
                @mouseenter="handleMenuHover(item, $event, true)"
                @mouseleave="handleMenuHover(item, $event, false)"
              >
                <!-- 图标 -->
                <div
                  class="flex items-center justify-center shrink-0 will-change-transform"
                  :class="isSidebarMinimized ? 'w-10 h-10' : 'w-4 h-4'"
                >
                  <n-icon :component="item.icon" :size="16" class="shrink-0" />
                </div>

                <!-- 文本和箭头容器 -->
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

                    <!-- 展开箭头（仅有子菜单时显示） -->
                    <div
                      v-if="item.children && !isSidebarMinimized"
                      class="ml-auto flex items-center shrink-0 transition-transform duration-200"
                      :class="{ 'rotate-90': expandedMenus.has(item.key) }"
                    >
                      <n-icon :component="ChevronForward" :size="14" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- 子菜单 -->
              <div
                v-if="item.children && !isSidebarMinimized"
                class="overflow-hidden transition-all duration-300 ease-out"
                :style="{
                  maxHeight: expandedMenus.has(item.key) ? `${item.children.length * 40}px` : '0px',
                  opacity: expandedMenus.has(item.key) ? 1 : 0,
                }"
              >
                <div class="pt-1 pb-1">
                  <div
                    v-for="child in item.children"
                    :key="child.key"
                    @click="handleMenuSelect(child.key)"
                    class="flex items-center py-2 ml-4 mr-1 px-4 rounded-lg min-w-0 cursor-pointer transition-colors duration-200 text-sm"
                    :style="{
                      backgroundColor: currentRoute === child.key ? themeColors.pressColor : 'transparent',
                      color: currentRoute === child.key ? themeColors.primary : themeColors.textSecondary,
                    }"
                    @mouseenter="handleChildMenuHover(child, $event, true)"
                    @mouseleave="handleChildMenuHover(child, $event, false)"
                  >
                    <span class="block whitespace-nowrap text-ellipsis overflow-hidden">
                      {{ child.label }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </nav>

      <!-- 底部用户头像 - 仅在头部隐藏时显示 -->
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
            @mouseenter="!isSidebarMinimized && ($event.target.style.backgroundColor = themeColors.hover)"
            @mouseleave="!isSidebarMinimized && ($event.target.style.backgroundColor = 'transparent')"
            :title="isSidebarMinimized ? `${userStore.userName}\uff5c${userStore.personalizedSignature}` : ''"
          >
            <!-- 头像固定尺寸且不参与过渡 -->
            <img
              class="w-10 h-10 shrink-0 grow-0 rounded-full object-cover"
              src="@/assets/default/OIP.jpeg"
              alt="user avatar"
            />

            <!-- 文本容器用 grid 做列宽动画，防止布局抖动 -->
            <div
              class="grid min-w-0 overflow-hidden transition-[grid-template-columns] duration-200 ease-in-out"
              :class="isSidebarMinimized ? '[grid-template-columns:0fr]' : '[grid-template-columns:1fr]'"
            >
              <div
                class="min-w-0 transition-[opacity,transform] duration-200 will-change-[opacity,transform]"
                :class="isSidebarMinimized ? 'opacity-0 -translate-x-2' : 'opacity-100 translate-x-0'"
              >
                <!-- 用户名 -->
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

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { NButton, NIcon, NDropdown } from 'naive-ui'
import { MenuOutline, ChevronForward } from '@vicons/ionicons5'

import { useGlobalStore } from '@/stores/global-store'
import { useUserStore } from '@/stores/modules/useUserStore.ts'
import { getThemeColors } from '@/config/theme'
import { generateMenuFromRouter } from '@/config/menu'

const globalStore = useGlobalStore()
const userStore = useUserStore()
const { isSidebarMinimized, isHeaderVisible, isDarkMode, userDropdownOptions } = storeToRefs(globalStore)

const router = useRouter()
const route = useRoute()

// 计算当前主题颜色
const themeColors = computed(() => {
  return getThemeColors(isDarkMode.value ? 'dark' : 'light')
})

// 多级菜单展开状态管理
const expandedMenus = ref(new Set())

const currentRoute = computed(() => route.name)

// 从路由动态生成菜单配置
const menuOptions = computed(() => generateMenuFromRouter(router))

const toggleSidebar = () => {
  globalStore.toggleSidebar()
}

const closeSidebar = () => {
  globalStore.isSidebarMinimized = true
}

// 切换子菜单展开状态
const toggleSubmenu = (key) => {
  if (expandedMenus.value.has(key)) {
    expandedMenus.value.delete(key)
  } else {
    expandedMenus.value.add(key)
  }
}

// 处理菜单点击
const handleMenuClick = (item) => {
  if (isSidebarMinimized.value) {
    if (item.children && item.redirect) {
      handleMenuSelect(item.redirect)
      globalStore.toggleSidebar()
      setTimeout(() => {
        expandedMenus.value.add(item.key)
      }, 100)
    } else if (item.children) {
      globalStore.toggleSidebar()
      setTimeout(() => {
        expandedMenus.value.add(item.key)
      }, 100)
    } else {
      handleMenuSelect(item.key)
    }
  } else {
    if (item.children) {
      toggleSubmenu(item.key)
    } else {
      handleMenuSelect(item.key)
    }
  }
}

const handleMenuSelect = (key) => {
  try {
    router.push({ name: key })
  } catch (error) {
    console.warn(`Route ${key} not found, redirecting to home`)
    router.push({ name: 'bidDocumentReview' })
  }
  const isMobile = window.innerWidth < 768
  if (isMobile) {
    closeSidebar()
  }
}

// 检查菜单是否激活（包括子菜单）
const isMenuActive = (item) => {
  if (currentRoute.value === item.key) {
    return true
  }
  if (item.children) {
    return item.children.some((child) => currentRoute.value === child.key)
  }
  return false
}

// 处理父级菜单hover
const handleMenuHover = (item, event, isEnter) => {
  const isActive = isMenuActive(item)
  if (isEnter) {
    event.target.style.backgroundColor = isActive ? themeColors.value.pressColor : themeColors.value.hover
  } else {
    event.target.style.backgroundColor = isActive ? themeColors.value.pressColor : 'transparent'
  }
}

// 处理子菜单hover
const handleChildMenuHover = (child, event, isEnter) => {
  const isActive = currentRoute.value === child.key
  if (isEnter) {
    event.target.style.backgroundColor = isActive ? themeColors.value.pressColor : themeColors.value.hover
  } else {
    event.target.style.backgroundColor = isActive ? themeColors.value.pressColor : 'transparent'
  }
}

const goHome = () => {
  router.push({ path: '/' })
}

// Emits
const emit = defineEmits(['open-settings'])

// 处理用户操作
const handleUserAction = (key, data) => {
  data.cb()
}
</script>
