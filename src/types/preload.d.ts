export {}

declare global {
  interface Window {
    electronAPI: {
      send: (channel: string, data: any) => void
      receive: (channel: string, func: (...args: any[]) => void) => void
      invoke: (channel: string, data?: any) => Promise<any>
      openMainWindow: () => void
      logoutToLoginWindow: () => void
      db: {
        isAvailable: () => Promise<boolean>
        insertSystemSetting: (templateBaseUrl: string, reportSave: string) => Promise<number>
        getSystemSetting: () => Promise<{
          id: number
          templateBaseUrl: string
          reportSave: string
          status: number
          createdAt: string
        } | null>
        updateSystemSetting: (id: number, data: Record<string, unknown>) => Promise<void>
        insertTemplate: (fileUrl: string) => Promise<number>
        addTemplate: (fileUrl: string) => Promise<number>
        listTemplates: () => Promise<Array<{ id: number; fileUrl: string; createdAt: string }>>
        deleteTemplate: (id: number) => Promise<void>
      }
    }
  }
}
