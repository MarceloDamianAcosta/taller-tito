import { readdir, unlink } from 'fs/promises'
import { join } from 'path'
import { eq, sql } from 'drizzle-orm'
import { db } from '../../../db/index'
import { brandConfig } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })
  if (session.user.role !== 'admin') throw createError({ statusCode: 403, message: 'Acceso denegado' })

  const uploadsDir = join(process.cwd(), 'uploads', 'branding')
  try {
    const existing = await readdir(uploadsDir)
    for (const name of existing) {
      if (/^logo_\d+\.(png|jpg|jpeg|svg)$/i.test(name)) {
        await unlink(join(uploadsDir, name)).catch(() => {})
      }
    }
  } catch {
    // dir no existía
  }

  db.update(brandConfig).set({
    logoPath: null,
    updatedAt: sql`(datetime('now'))`
  }).where(eq(brandConfig.id, 1)).run()

  return { logoPath: null }
})
