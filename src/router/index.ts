import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import {BrowsersOutline, ReaderOutline} from "@vicons/ionicons5";
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
        meta: { title: '报告生成',icon: ReaderOutline },
        component: () => import('@/views/home/index.vue'),
      },
        {
            path: '/tem',
            component: () => import('@/views/tem/index.vue'),
            name: 'Tem',
            meta: { title: '模版管理',icon: BrowsersOutline },
        }
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
  return true
})

router.afterEach((to, from) => {
  // Example: stop progress bar, analytics, etc.
})

export default router
