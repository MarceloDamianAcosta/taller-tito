import { requireAdmin, readControl, type UpdateStatus } from '../../../utils/system'

// Estado del update en curso (o el último). El front hace polling cada ~2s.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return readControl<UpdateStatus>('status.json') ?? { phase: 'idle' }
})
