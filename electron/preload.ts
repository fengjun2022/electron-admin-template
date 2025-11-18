import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // window.electronAPI.openMainWindow() -> ask main to open main window
  openMainWindow: () => ipcRenderer.send('open-main-window'),
  // window.electronAPI.logoutToLoginWindow() -> ask main to close main and open login
  logoutToLoginWindow: () => ipcRenderer.send('logout-to-login'),
  send: (channel: string, data: any) => ipcRenderer.send(channel, data),
  receive: (channel: string, func: (...args: any[]) => void) =>
    ipcRenderer.on(channel, (_, ...args) => func(...args)),
  invoke: (channel: string, data?: any) => ipcRenderer.invoke(channel, data),
  db: {
    // system_setting
    insertSystemSetting: (templateBaseUrl: string, reportSave: string) =>
      ipcRenderer.invoke('db:insertSystemSetting', { templateBaseUrl, reportSave }) as Promise<number>,
    getSystemSetting: () => ipcRenderer.invoke('db:getSystemSetting') as Promise<{
      id: number
      templateBaseUrl: string
      reportSave: string
      status: number
      createdAt: string
    } | null>,
    updateSystemSetting: (id: number, data: Record<string, unknown>) =>
      ipcRenderer.invoke('db:updateSystemSetting', { id, data }) as Promise<void>,

    // report_template
    insertTemplate: (fileUrl: string) => ipcRenderer.invoke('db:insertTemplate', { fileUrl }) as Promise<number>,
    listTemplates: () => ipcRenderer.invoke('db:listTemplates') as Promise<Array<{ id: number; fileUrl: string; createdAt: string }>>,
    deleteTemplate: (id: number) => ipcRenderer.invoke('db:deleteTemplate', { id }) as Promise<void>,

    // 兼容旧通道名
    addTemplate: (fileUrl: string) => ipcRenderer.invoke('db:addTemplate', { fileUrl }) as Promise<number>,
  },
})
