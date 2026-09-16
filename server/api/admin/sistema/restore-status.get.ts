import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { requireAdmin, readControl, type RestoreStatus } from '../../../utils/system'

const RESTORE_UPLOADS_DIR = join(process.cwd(), 'restore-uploads')

export interface RestorePending {
  dbSize: number
  hasUploads: boolean
  uploadsSize: number | null
}

// Estado del restore en curso (o el último), más si hay un backup ya subido
// esperando confirmación. El front hace polling cada ~2s mientras corre.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const dbPath = join(RESTORE_UPLOADS_DIR, 'pending.db')
  const uploadsPath = join(RESTORE_UPLOADS_DIR, 'pending-uploads.tar.gz')
  const hasDb = existsSync(dbPath)
  const pending: RestorePending | null = hasDb
    ? {
        dbSize: statSync(dbPath).size,
        hasUploads: existsSync(uploadsPath),
        uploadsSize: existsSync(uploadsPath) ? statSync(uploadsPath).size : null
      }
    : null

  return {
    status: readControl<RestoreStatus>('restore-status.json') ?? { phase: 'idle' },
    pending
  }
})
