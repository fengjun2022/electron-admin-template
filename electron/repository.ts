import { db } from './db'
import { systemSetting, reportTemplate } from './schema'
import { eq } from 'drizzle-orm'

export function insertSystemSetting(templateBaseUrl: string, reportSave: string) {
  const result = db.insert(systemSetting).values({
    templateBaseUrl,
    reportSave,
    status: 1,
  }).run()

  return result.lastInsertRowid as number
}

export function getSystemSetting() {
  const rows = db.select()
    .from(systemSetting)
    .where(eq(systemSetting.status, 1))
    .limit(1)
    .all()

  return rows[0] ?? null
}

export function listTemplates() {
  return db.select()
    .from(reportTemplate)
    .orderBy(reportTemplate.id)
    .all()
}

export function insertTemplate(fileUrl: string) {
  const res = db.insert(reportTemplate).values({ fileUrl }).run()
  return res.lastInsertRowid as number
}

export function updateSystemSetting(id: number, data: Partial<typeof systemSetting.$inferInsert>) {
  db.update(systemSetting)
    .set(data)
    .where(eq(systemSetting.id, id))
    .run()
}

export function deleteTemplate(id: number) {
  db.delete(reportTemplate)
    .where(eq(reportTemplate.id, id))
    .run()
}

