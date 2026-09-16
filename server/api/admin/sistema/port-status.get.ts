import { requireAdmin, readControl, currentPort, type PortStatus } from '../../../utils/system'

// Estado del cambio de puerto en curso (o el último), más el puerto vigente
// ahora mismo (leído del propio proceso, ver currentPort()).
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return {
    current: currentPort(),
    status: readControl<PortStatus>('port-status.json') ?? { phase: 'idle' }
  }
})
