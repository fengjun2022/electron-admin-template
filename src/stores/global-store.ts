import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import router from '@/router'
import { useUserStore } from '@/stores/modules/useUserStore'
import { useAuthStore } from '@/stores/modules/useAuthStore'

export const useGlobalStore = defineStore('global', () => {
  // state
  const isSidebarMinimized = ref(true)
  const isHeaderVisible = ref(false)
  const isBreadcrumbBarVisible = ref(false)
  const isDarkMode = ref(false)
  const showSettingsDrawer = ref(false)
  const adminOrChat = ref(false) // false=小知AI(ChatSiderBar)，true=控制台
  const chatTaskParams = ref({
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

  // 下拉菜单
  const userDropdownOptions = computed(() => [
    {
      label: 'Prompt设置',
      key: 'prompt-studio',
      cb: () => router.push('/prompt-studio'),
    },
    {
      label: isDarkMode.value ? '切换到日间模式' : '切换到夜间模式',
      key: 'toggle-theme',
      cb: () => toggleTheme(),
    },
    {
      label: '设置',
      key: 'settings',
      cb: () => (showSettingsDrawer.value = true),
    },
    {
      label: '退出登录',
      key: 'logout',
      cb: logout
    },
  ])

    const logout =() => {
            const userStore = useUserStore()
            const authStore = useAuthStore()
            userStore.cleanUserInfo()
            authStore.logout()
            if ((window as any)?.electronAPI?.logoutToLoginWindow) {
              ;(window as any).electronAPI.logoutToLoginWindow()
            } else {
              router.push('/login')
            }
        }


  // getters
  const themeClass = computed(() => (isDarkMode.value ? 'dark' : 'light'))

  // actions
  function toggleSidebar() {
    isSidebarMinimized.value = !isSidebarMinimized.value
  }

  function changeAdminOrChat() {
      adminOrChat.value = !adminOrChat.value
  }

  function toggleHeader() {
    isHeaderVisible.value = !isHeaderVisible.value
  }

  function setHeaderVisible(visible: boolean) {
    isHeaderVisible.value = visible
  }

  function toggleBreadcrumbBar() {
    isBreadcrumbBarVisible.value = !isBreadcrumbBarVisible.value
  }

  function setBreadcrumbBarVisible(visible: boolean) {
    isBreadcrumbBarVisible.value = visible
  }

  function toggleTheme() {
    isDarkMode.value = !isDarkMode.value
    applyTheme()
  }

  function applyTheme() {
    if (typeof window === 'undefined') return
    if (isDarkMode.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // ===== 持久化：初始化读取 + 变更写入 =====
  function initStore() {
    if (typeof window === 'undefined') return

    // 主题
    const savedTheme = localStorage.getItem('theme') // 'dark' | 'light' | null
    if (savedTheme === 'dark') isDarkMode.value = true
    else if (savedTheme === 'light') isDarkMode.value = false
    else isDarkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    applyTheme()

    // 头部显示
    const savedHeaderVisible = localStorage.getItem('headerVisible') // 'true'|'false'|null
    if (savedHeaderVisible !== null) {
      isHeaderVisible.value = savedHeaderVisible === 'true'
    }

    // 面包屑显示
    const savedBreadcrumbBarVisible = localStorage.getItem('breadcrumbBarVisible')
    if (savedBreadcrumbBarVisible !== null) {
      isBreadcrumbBarVisible.value = savedBreadcrumbBarVisible === 'true'
    }

    // 固定为小知AI模式（隐藏切换回控制台入口）
    adminOrChat.value = false

    const savedChatTaskParams = localStorage.getItem('chatTaskParams')
    if (savedChatTaskParams) {
      try {
        chatTaskParams.value = { ...chatTaskParams.value, ...JSON.parse(savedChatTaskParams) }
      } catch {
        // ignore invalid local cache
      }
    }
  }

  // 变更时自动写入（避免在各处手动 setItem）
  watch(isDarkMode, (val) => {
    if (typeof window === 'undefined') return
    localStorage.setItem('theme', val ? 'dark' : 'light')
  })

  watch(isHeaderVisible, (val) => {
    if (typeof window === 'undefined') return
    localStorage.setItem('headerVisible', val.toString())
  })

  watch(isBreadcrumbBarVisible, (val) => {
    if (typeof window === 'undefined') return
    localStorage.setItem('breadcrumbBarVisible', val.toString())
  })

  watch(adminOrChat, (val) => {
    if (typeof window === 'undefined') return
    localStorage.setItem('adminOrChat', val.toString())
  })

  watch(
    chatTaskParams,
    (val) => {
      if (typeof window === 'undefined') return
      localStorage.setItem('chatTaskParams', JSON.stringify(val))
    },
    { deep: true },
  )

  // （可选）是否要记住侧边栏收起状态：
  // watch(isSidebarMinimized, (val) => {
  //   if (typeof window === 'undefined') return
  //   localStorage.setItem('sidebarMinimized', val.toString())
  // })

  // 定义后立即初始化（在 store 内部调用）
  initStore()

  return {
    // state
    isSidebarMinimized,
    isHeaderVisible,
    isBreadcrumbBarVisible,
    isDarkMode,
    showSettingsDrawer,
    adminOrChat,
    chatTaskParams,
    userDropdownOptions,
    // getters
    themeClass,
    // actions
    toggleSidebar,
    toggleHeader,
    setHeaderVisible,
    toggleBreadcrumbBar,
    setBreadcrumbBarVisible,
    toggleTheme,
      changeAdminOrChat,
    applyTheme,
      logout
    // 如果外部也想手动触发，可导出：
    // initStore,
  }
})
