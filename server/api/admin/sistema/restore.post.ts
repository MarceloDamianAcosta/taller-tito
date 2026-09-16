import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { requireAdmin, writeRequest, anyOperationActive } from '../../../utils/system'

const PENDING_DB = join(process.cwd(), 'restore-uploads', 'pending.db')

// Dispara el restore en el host (taller-restore.sh vía systemd .path) del backup
// subido previamente con POST .../restore-upload. Pisa la DB y los uploads
// actuales sin vuelta atrás con un click — por eso pide una confirmación
// explícita (no solo un booleano) y el propio script hace un backup del estado
// previo antes de tocar nada.
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  const body = await readBody<{ confirm?: string }>(event)
  if (body?.confirm !== 'RESTAURAR') {
    throw createError({ statusCode: 400, message: 'Confirmación inválida' })
  }
  if (!existsSync(PENDING_DB)) {
    throw createError({ statusCode: 400, message: 'No hay ningún backup subido para restaurar' })
  }

  const busy = anyOperationActive()
  if (busy) throw createError({ statusCode: 409, message: busy })

  writeRequest('restore.request.json', { requestedBy: user.username, at: new Date().toISOString() })
  return { ok: true }
})
