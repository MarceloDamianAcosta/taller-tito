import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import { requireAdmin } from '../../../../utils/system'

const BACKUPS_DIR = join(process.cwd(), 'backups')

// Descarga un archivo de backup (.db o -uploads.tar.gz). El nombre viene de
// lo que ya devolvió GET /api/admin/sistema/backups, pero igual se valida acá
// para no confiar en el input del cliente (path traversal, etc).
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const file = getRouterParam(event, 'file') || ''
  if (!/^[A-Za-z0-9._-]+\.(db|tar\.gz)$/.test(file) || file.includes('..')) {
    throw createError({ statusCode: 400, message: 'Nombre de archivo inválido' })
  }

  const filepath = join(BACKUPS_DIR, file)
  try {
    await stat(filepath)
  } catch {
    throw createError({ statusCode: 404, message: 'Backup no encontrado' })
  }

  setHeader(event, 'Content-Type', file.endsWith('.db') ? 'application/octet-stream' : 'application/gzip')
  setHeader(event, 'Content-Disposition', `attachment; filename="${file}"`)
  return sendStream(event, createReadStream(filepath))
})
