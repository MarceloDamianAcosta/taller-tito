import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { requireAdmin } from '../../../utils/system'

// backups/ vive en el volume prod-uploads... no, es un mount aparte (ver
// docker-compose.yml: ./backups:/app/backups:ro) — de solo lectura porque
// quien escribe ahí es siempre db-backup.sh en el host, nunca la app.
const BACKUPS_DIR = join(process.cwd(), 'backups')

export interface BackupEntry {
  name: string
  dbFile: string
  dbSize: number
  uploadsFile: string | null
  uploadsSize: number | null
  mtime: string
}

export default defineEventHandler(async (event): Promise<BackupEntry[]> => {
  await requireAdmin(event)

  let files: string[]
  try {
    files = await readdir(BACKUPS_DIR)
  } catch {
    return []
  }

  const fileSet = new Set(files)
  const dbFiles = files.filter(f => f.endsWith('.db')).sort().reverse()

  const entries: BackupEntry[] = []
  for (const dbFile of dbFiles) {
    const name = dbFile.slice(0, -3)
    const uploadsFile = `${name}-uploads.tar.gz`
    const dbStat = await stat(join(BACKUPS_DIR, dbFile))
    const hasUploads = fileSet.has(uploadsFile)
    entries.push({
      name,
      dbFile,
      dbSize: dbStat.size,
      uploadsFile: hasUploads ? uploadsFile : null,
      uploadsSize: hasUploads ? (await stat(join(BACKUPS_DIR, uploadsFile))).size : null,
      mtime: dbStat.mtime.toISOString()
    })
  }
  return entries
})
