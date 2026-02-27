import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { ReaderOutline, DocumentTextOutline, CogOutline, PeopleOutline } from "@vicons/ionicons5";
// Route definitions
const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    redirect: "/home",
    children: [
      {
        path: '/home',
        name: 'Home',
        meta: { title: '小知AI',icon: ReaderOutline },
        component: () => import('@/views/home/index.vue'),
      },
      {
        path: '/jobs/:jobId',
        name: 'JobDetail',
        meta: { title: '任务详情', icon: DocumentTextOutline, hideInMenu: true },
        component: () => import('@/views/job-detail/index.vue'),
      },
      {
        path: '/prompt-studio',
        name: 'PromptStudio',
        meta: { title: 'Prompt设置', icon: CogOutline, hideInMenu: true },
        component: () => import('@/views/prompt-studio/index.vue'),
      },
      {
        path: '/user-admin',
        name: 'UserAdmin',
        meta: { title: '用户管理', icon: PeopleOutline, hideInMenu: true, requiresAdmin: true },
        component: () => import('@/views/user-admin/index.vue'),
      },
    ],
  },
    {
        path: '/login',
        name: 'Login',
        component: () => import('@/views/login/index.vue'),
    }
]

// Use hash history for Electron compatibility (file:// protocol)
const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

function parseTokenPayload(token: string): Record<string, any> | null {
  try {
    const msg = String(token || '').split('.', 1)[0] || ''
    if (!msg) return null
    const normalized = msg.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    const raw = atob(padded)
    const obj = JSON.parse(raw)
    return obj && typeof obj === 'object' ? obj : null
  } catch {
    return null
  }
}

// Global guards (scaffold)
router.beforeEach((to, from) => {
  // Example: set page title from meta, add auth checks here
  if (to.meta && typeof to.meta.title === 'string') {
    document.title = to.meta.title
  }
  // Example auth placeholder
  // const isAuthed = true // TODO: replace with real auth state
  // if (to.meta?.requiresAuth && !isAuthed) return { name: 'Home' }
  // Returning void/true continues navigation
  const token = typeof window !== 'undefined' ? (localStorage.getItem('robot_web_auth_token') || '') : ''
  const isElectron = typeof window !== 'undefined' && Boolean((window as any)?.electronAPI)
  if (to.path !== '/login' && !token) {
    return { path: '/login' }
  }
  if ((to.meta as any)?.requiresAdmin) {
    const payload = parseTokenPayload(token)
    const role = String(payload?.role || '').toLowerCase()
    if (role !== 'admin') {
      return { path: '/home' }
    }
  }
  // Electron 登录窗每次都固定落在 /login，不因为本地 token 自动跳到 /home。
  if (to.path === '/login' && token && !isElectron) {
    return { path: '/home' }
  }
  return true
})

router.afterEach((to, from) => {
  // Example: stop progress bar, analytics, etc.
})

export default router
