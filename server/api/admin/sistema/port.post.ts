import { requireAdmin, writeRequest, anyOperationActive, currentPort } from '../../../utils/system'

// Dispara un cambio de puerto en el host (taller-port.sh vía systemd .path):
// reescribe P en .env y recrea `prod`. Si el puerto nuevo no responde, el
// script hace rollback solo al puerto anterior.
export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)

  const body = await readBody<{ port?: number }>(event)
  const port = Number(body?.port)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw createError({ statusCode: 400, message: 'Puerto inválido (1-65535)' })
  }
  if (port === currentPort()) {
    throw createError({ statusCode: 400, message: 'Ya está usando ese puerto' })
  }

  const busy = anyOperationActive()
  if (busy) throw createError({ statusCode: 409, message: busy })

  writeRequest('port.request.json', { port, requestedBy: user.username, at: new Date().toISOString() })
  return { ok: true }
})
