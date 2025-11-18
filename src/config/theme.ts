export type ThemeMode = 'light' | 'dark'

export function getThemeColors(mode: ThemeMode) {
  if (mode === 'dark') {
      return {
          main: '#020617',      // 更深一点的整体背景
          component: '#0b1120', // 稍微亮一点的卡片
          text: '#e5e7eb',
          textSecondary: '#9ca3af',
          sidebar: '#020617',
          sidebarBorder: '#1f2937',
          primary: '#22c55e',
          hover: 'rgba(255,255,255,0.06)',
          pressColor: 'rgba(34, 197, 94, 0.12)',
      }

  }

  return {
    main: '#f8fafc',
    component: '#ffffff',
    text: '#0f172a',
    textSecondary: '#475569',
    sidebar: '#ffffffcc',
    sidebarBorder: '#e5e7eb',
    primary: '#2563eb',
    hover: 'rgba(15, 23, 42, 0.04)',
    pressColor: 'rgba(37, 99, 235, 0.08)',
  }
}

