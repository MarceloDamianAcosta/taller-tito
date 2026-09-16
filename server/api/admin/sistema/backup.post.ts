import { requireAdmin, writeRequest, anyOperationActive } from '../../../utils/system'

// Dispara un backup manual en el host (taller-backup.sh vía systemd .path).
// db-backup.sh para `prod` un momento para que SQLite no esté escribiendo,
// por eso tiene que correr en el host, no en el propio contenedor.
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  const busy = anyOperationActive()
  if (busy) throw createError({ statusCode: 409, message: busy })

  writeRequest('backup.request.json', { requestedBy: user.username, at: new Date().toISOString() })
  return { ok: true }
})
