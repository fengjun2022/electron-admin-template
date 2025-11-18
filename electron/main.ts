import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { initDatabase } from './db'
import {
  insertSystemSetting,
  getSystemSetting,
  updateSystemSetting,
  listTemplates,
  insertTemplate,
  deleteTemplate,
} from './repository'

let loginWindow: BrowserWindow | null = null
let mainWindow: BrowserWindow | null = null

const loadUrlWithHash = (win: BrowserWindow, hash: string) => {
  if (process.env.VITE_DEV_SERVER_URL) {
    const base = process.env.VITE_DEV_SERVER_URL.endsWith('/')
      ? process.env.VITE_DEV_SERVER_URL.slice(0, -1)
      : process.env.VITE_DEV_SERVER_URL
    win.loadURL(`${base}/#${hash}`)
    if (process.env.OPEN_DEVTOOLS === '1') {
      win.webContents.openDevTools()
    }
  } else {
    // In production, load built file with hash
    win.loadFile(path.join(__dirname, '../dist/index.html'), { hash })
  }
}

const createLoginWindow = () => {
  if (loginWindow) return loginWindow
  loginWindow = new BrowserWindow({
    width: 330,
    height: 500,
    resizable: false,
    fullscreenable: false,
    maximizable: false,
    minimizable: true,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  loadUrlWithHash(loginWindow, '/login')

  loginWindow.on('closed', () => {
    loginWindow = null
  })
  return loginWindow
}

const createMainWindow = () => {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
    return mainWindow
  }
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    resizable: true,
    fullscreenable: true,
    maximizable: true,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  loadUrlWithHash(mainWindow, '/')

  mainWindow.on('closed', () => {
    mainWindow = null
  })
  return mainWindow
}

app.whenReady().then(() => {
  // 启动自动建表 + 默认数据
  initDatabase()
  // IPC handlers (Drizzle + better-sqlite3)
  ipcMain.handle('db:insertSystemSetting', (_e, payload: { templateBaseUrl: string; reportSave: string }) => {
    return insertSystemSetting(payload.templateBaseUrl, payload.reportSave)
  })
  ipcMain.handle('db:getSystemSetting', () => {
    return getSystemSetting()
  })
  ipcMain.handle('db:updateSystemSetting', (_e, payload: { id: number; data: Record<string, unknown> }) => {
    return updateSystemSetting(payload.id, payload.data as any)
  })

  ipcMain.handle('db:insertTemplate', (_e, payload: { fileUrl: string }) => {
    return insertTemplate(payload.fileUrl)
  })
  // 兼容旧通道名（如之前使用过）
  ipcMain.handle('db:addTemplate', (_e, payload: { fileUrl: string }) => {
    return insertTemplate(payload.fileUrl)
  })
  ipcMain.handle('db:listTemplates', () => {
    return listTemplates()
  })
  ipcMain.handle('db:deleteTemplate', (_e, payload: { id: number }) => {
    return deleteTemplate(payload.id)
  })

  // Open login window first
  createLoginWindow()

  // Switch to main window on request
  ipcMain.on('open-main-window', () => {
    createMainWindow()
    if (loginWindow) {
      loginWindow.close()
      loginWindow = null
    }
  })

  // Logout: return to login window and close main window
  ipcMain.on('logout-to-login', () => {
    createLoginWindow()
    if (mainWindow) {
      mainWindow.close()
      mainWindow = null
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createLoginWindow()
})
