import { writeFile, mkdir, readdir, unlink } from 'fs/promises'
import { join } from 'path'
import { eq, sql } from 'drizzle-orm'
import { db } from '../../../db/index'
import { brandConfig } from '../../../db/schema'

const MAX_BYTES = 2 * 1024 * 1024

const ALLOWED: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/svg+xml': 'svg'
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })
  if (session.user.role !== 'admin') throw createError({ statusCode: 403, message: 'Acceso denegado' })

  const formData = await readFormData(event)
  const file = formData.get('archivo') as File | null
  if (!file) throw createError({ statusCode: 400, message: 'Archivo requerido' })

  const ext = ALLOWED[file.type]
  if (!ext) throw createError({ statusCode: 400, message: 'Tipo de archivo no permitido (PNG, JPG o SVG)' })

  if (file.size > MAX_BYTES) {
    throw createError({ statusCode: 400, message: 'Archivo excede 2MB' })
  }

  const uploadsDir = join(process.cwd(), 'uploads', 'branding')
  await mkdir(uploadsDir, { recursive: true })

  try {
    const existing = await readdir(uploadsDir)
    for (const name of existing) {
      if (/^logo_\d+\.(png|jpg|jpeg|svg)$/i.test(name)) {
        await unlink(join(uploadsDir, name)).catch(() => {})
      }
    }
  } catch {
    // dir vacío o no existía
  }

  const filename = `logo_${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(join(uploadsDir, filename), buffer)

  const updated = db.update(brandConfig).set({
    logoPath: filename,
    updatedAt: sql`(datetime('now'))`
  }).where(eq(brandConfig.id, 1)).run()

  if (updated.changes === 0) {
    throw createError({ statusCode: 500, message: 'No existe brand_config (id=1)' })
  }

  return { logoPath: `/api/branding/${filename}` }
})
