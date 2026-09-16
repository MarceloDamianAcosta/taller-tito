import { requireAdmin, readControl, type BackupStatus } from '../../../utils/system'

// Estado del backup manual en curso (o el último). El front hace polling cada ~2s.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return readControl<BackupStatus>('backup-status.json') ?? { phase: 'idle' }
})
