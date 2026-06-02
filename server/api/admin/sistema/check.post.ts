import { requireAdmin, writeRequest } from '../../../utils/system'

// Dispara un git fetch en el host (check-updates.sh) que compara SHAs y escribe
// control/remote.json. El front lo lee con /api/admin/sistema/version.
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  writeRequest('check.request.json', { requestedBy: user.username, at: new Date().toISOString() })
  return { ok: true }
})
