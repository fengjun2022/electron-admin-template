import type { Router } from 'vue-router'
import { ReaderOutline,BrowsersOutline } from '@vicons/ionicons5'
interface MenuItem {
  key: string
  label: string
  icon?: any
  redirect?: string
  children?: Array<{ key: string; label: string }>
}

export function generateMenuFromRouter(router: Router): MenuItem[] {
    const routes = router.getRoutes()

    // 找到 layout 根路由（path: '/'）
    const root = routes.find(r => r.path === '/')
    if (!root || !root.children) return []

    return root.children
        .filter(r => r.name && r.meta?.title) // 必须有 name + title 才能作为菜单
        .map(r => ({
            key: r.name as string,
            label: r.meta!.title as string,
            icon: r.meta!.icon ?? null,
        }))
}
