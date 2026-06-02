import { requireAdmin, writeRequest, readControl, ACTIVE_PHASES, type UpdateStatus } from '../../../utils/system'

// Dispara la actualización en el host (taller-updater.sh vía systemd .path).
// Rechaza si ya hay una en curso; el flock del script es el candado real.
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  const status = readControl<UpdateStatus>('status.json')
  if (status?.phase && (ACTIVE_PHASES as readonly string[]).includes(status.phase)) {
    throw createError({ statusCode: 409, message: 'Ya hay una actualización en curso' })
  }

  writeRequest('update.request.json', { requestedBy: user.username, at: new Date().toISOString() })
  return { ok: true }
})
