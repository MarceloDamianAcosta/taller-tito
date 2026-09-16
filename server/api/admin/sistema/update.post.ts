import { requireAdmin, writeRequest, anyOperationActive } from '../../../utils/system'

// Dispara la actualización en el host (taller-updater.sh vía systemd .path).
// Rechaza si ya hay una en curso (update/backup/cambio de puerto); el flock
// del script es el candado real.
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  const busy = anyOperationActive()
  if (busy) throw createError({ statusCode: 409, message: busy })

  writeRequest('update.request.json', { requestedBy: user.username, at: new Date().toISOString() })
  return { ok: true }
})
