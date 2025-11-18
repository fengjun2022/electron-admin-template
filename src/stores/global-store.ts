import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import router from '@/router'
import { useUserStore } from '@/stores/modules/useUserStore'

export const useGlobalStore = defineStore('global', () => {
  // state
  const isSidebarMinimized = ref(true)
  const isHeaderVisible = ref(false)
  const isBreadcrumbBarVisible = ref(true)
  const isDarkMode = ref(false)
  const showSettingsDrawer = ref(false)
  const adminOrChat = ref(true) // true=小知AI，false=控制台

  // 下拉菜单
  const userDropdownOptions = computed(() => [
    {
      label: adminOrChat.value ? '小知AI' : '控制台',
      key: 'toggle-admin-chat',
      cb: () => {
        adminOrChat.value = !adminOrChat.value
        // 不必手动写 localStorage，watch 会自动持久化
      },
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
            userStore.cleanUserInfo()
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

    // 小知AI / 控制台
    const savedAdminOrChat = localStorage.getItem('adminOrChat')
    if (savedAdminOrChat !== null) {
      adminOrChat.value = savedAdminOrChat === 'true'
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
