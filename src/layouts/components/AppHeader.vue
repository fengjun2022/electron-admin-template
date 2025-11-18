<template>
  <!-- 头部导航 -->
  <header
    class="app-header flex-shrink-0 backdrop-blur-md shadow-sm transition-all duration-300 border-b z-50 overflow-hidden"
    :class="{
      'h-16 opacity-100': isHeaderVisible,
      'h-0 opacity-0': !isHeaderVisible,
    }"
    :style="{
      backgroundColor: themeColors.main + '80',
      borderColor: themeColors.sidebarBorder,
      color: themeColors.text,
    }"
  >
    <div class="flex items-center justify-between px-6 h-full">
      <div class="flex items-center">
        <div class="flex items-center">
          <!-- logo -->
          <img class="w-8 h-8 mr-2" src="/vite.svg" alt="" />
          <div class="flex items-center space-x-3">
            <div>
              <div class="font-bold" :style="{ color: themeColors.text }">控制台</div>
              <div class="text-xs" :style="{ color: themeColors.textSecondary }">现代化管理平台</div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center space-x-4">
        <div class="flex items-center space-x-3">
          <img class="w-10 h-10 shrink-0 grow-0 rounded-full object-cover" src="@/assets/default/OIP.jpeg" alt="user avatar" />
          <span class="font-medium" :style="{ color: themeColors.text }">{{ userStore.userName }}</span>
        </div>
        <div class=" w-30 flex justify-between">
          <NButton
              text
              @click="globalStore.changeAdminOrChat()"
              :style="{ color: themeColors.textSecondary }"
              class="hover:bg-opacity-20"
              :title="adminOrChat ? '小知AI' : '控制台'"
          >
            <Icon icon="simple-icons:openai" width="17" height="17" />
          </NButton>

          <!-- 主题切换按钮 -->
          <NButton
              text
              @click="globalStore.toggleTheme()"
              :style="{ color: themeColors.textSecondary }"
              class="hover:bg-opacity-20"
              :title="isDarkMode ? '切换到日间模式' : '切换到夜间模式'"
          >
            <NIcon :component="isDarkMode ? SunnyOutline : MoonOutline" size="20" />
          </NButton>

          <!-- 设置按钮 -->
          <NButton
              text
              @click="emit('open-settings')"
              :style="{ color: themeColors.textSecondary }"
              class="hover:bg-opacity-20"
              title="设置"
          >
            <NIcon :component="SettingsOutline" size="20" />
          </NButton>

          <NButton
              text
              @click="globalStore.logout()"
              :style="{ color: themeColors.textSecondary }"
              class="hover:bg-opacity-20"
              title="退出登录"
          >
            <NIcon :component="LogOutOutline" size="20" />
          </NButton>
        </div>


      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { NButton, NIcon } from 'naive-ui'
import { LogOutOutline, MoonOutline, SunnyOutline, SettingsOutline } from '@vicons/ionicons5'
import { useRouter } from 'vue-router'

import { useGlobalStore } from '@/stores/global-store'
import { useUserStore } from '@/stores/modules/useUserStore.ts'
import { getThemeColors } from '@/config/theme'
import { Icon } from '@iconify/vue'

// Emits
const emit = defineEmits(['open-settings'])

const globalStore = useGlobalStore()
const userStore = useUserStore()
const { isHeaderVisible, isDarkMode, adminOrChat } = storeToRefs(globalStore)
const router = useRouter()

// 计算当前主题颜色
const themeColors = computed(() => {
  return getThemeColors(isDarkMode.value ? 'dark' : 'light')
})


</script>
