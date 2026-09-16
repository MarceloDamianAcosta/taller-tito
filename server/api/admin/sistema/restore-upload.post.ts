import { writeFile, mkdir, rename, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { requireAdmin, anyOperationActive } from '../../../utils/system'

// Sube el backup a restaurar. No lo aplica todavía — solo lo deja esperando en
// restore-uploads/pending.db (+ pending-uploads.tar.gz si vino) hasta que se
// confirme con POST /api/admin/sistema/restore.
const RESTORE_UPLOADS_DIR = join(process.cwd(), 'restore-uploads')

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const busy = anyOperationActive()
  if (busy) throw createError({ statusCode: 409, message: busy })

  const formData = await readFormData(event)
  const dbFile = formData.get('db') as File | null
  const uploadsFile = formData.get('uploads') as File | null

  if (!dbFile || !dbFile.size) {
    throw createError({ statusCode: 400, message: 'Falta el archivo de base de datos (.db)' })
  }
  if (!dbFile.name.toLowerCase().endsWith('.db')) {
    throw createError({ statusCode: 400, message: 'El archivo de base de datos debe ser .db' })
  }
  if (uploadsFile && uploadsFile.size && !uploadsFile.name.toLowerCase().endsWith('.tar.gz')) {
    throw createError({ statusCode: 400, message: 'Los archivos adjuntos deben ser un .tar.gz' })
  }

  await mkdir(RESTORE_UPLOADS_DIR, { recursive: true })

  // Nombres fijos ("pending"), no el nombre original: taller-restore.sh siempre
  // busca los mismos dos archivos. Escritura atómica (tmp + rename) para no dejar
  // un .db a medio escribir si se corta la subida.
  const dbTmp = join(RESTORE_UPLOADS_DIR, 'pending.db.tmp')
  const dbDest = join(RESTORE_UPLOADS_DIR, 'pending.db')
  await writeFile(dbTmp, Buffer.from(await dbFile.arrayBuffer()))
  await rename(dbTmp, dbDest)

  const uploadsDest = join(RESTORE_UPLOADS_DIR, 'pending-uploads.tar.gz')
  if (uploadsFile && uploadsFile.size) {
    const uploadsTmp = join(RESTORE_UPLOADS_DIR, 'pending-uploads.tar.gz.tmp')
    await writeFile(uploadsTmp, Buffer.from(await uploadsFile.arrayBuffer()))
    await rename(uploadsTmp, uploadsDest)
  } else {
    // Si el pedido anterior había dejado un tarball de uploads y este no trae uno
    // nuevo, no lo dejamos pisando el restore actual.
    await unlink(uploadsDest).catch(() => {})
  }

  return { ok: true, dbSize: dbFile.size, uploadsSize: uploadsFile?.size ?? null }
})
