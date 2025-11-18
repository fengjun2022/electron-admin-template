import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'

// 定义数据库路径
const userDir = app.getPath('userData')
const dbPath = path.join(userDir, 'app.db')

// 初始化目录 + DB（better-sqlite3 在不存在时会创建文件）
// 确保目录存在后再创建数据库文件
fs.mkdirSync(userDir, { recursive: true })
const sqlite = new Database(dbPath)
export const db = drizzle(sqlite)

// 启动时自动建表（如不存在则创建）
export function initDatabase() {
  // system_setting
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS system_setting (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_base_url TEXT NOT NULL,
      report_save TEXT NOT NULL,
      status INT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // report_template
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS report_template (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // report_result_template
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS report_result_template (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // 插入一条默认 system_setting（仅在没有启用记录时）
  systemInit()
}

// 初始化默认配置（幂等）
export function systemInit() {
  const row = sqlite.prepare(`SELECT COUNT(1) AS cnt FROM system_setting WHERE status = 1`).get() as { cnt: number }
  if (row.cnt > 0) return

  const templateBaseUrl = path.join(userDir, 'TemplateBaseUrl')
  const reportSave = path.join(userDir, 'ReportSaveUrl')
  try {
    fs.mkdirSync(templateBaseUrl, { recursive: true })
    fs.mkdirSync(reportSave, { recursive: true })
  } catch {}

  const stmt = sqlite.prepare('INSERT INTO system_setting (template_base_url, report_save, status) VALUES (?, ?, ?)')
  stmt.run(templateBaseUrl, reportSave, 1)
}
