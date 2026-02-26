import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { BrowsersOutline, ReaderOutline, DocumentTextOutline, CogOutline } from "@vicons/ionicons5";
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
  if (to.path !== '/login' && !token) {
    return { path: '/login' }
  }
  if (to.path === '/login' && token) {
    return { path: '/home' }
  }
  return true
})

router.afterEach((to, from) => {
  // Example: stop progress bar, analytics, etc.
})

export default router
