import { unlink } from 'fs/promises'
import { join } from 'path'
import { db } from '../../db/index'
import { bibliotecaArchivos, otArchivos } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID inválido' })

  const record = db.select().from(bibliotecaArchivos).where(eq(bibliotecaArchivos.id, id)).get()
  if (!record) throw createError({ statusCode: 404, message: 'Archivo no encontrado' })

  const used = db.select().from(otArchivos).where(eq(otArchivos.bibliotecaId, id)).get()
  if (used) {
    throw createError({ statusCode: 409, message: 'El archivo está asociado a una o más órdenes de trabajo y no puede eliminarse' })
  }

  db.delete(bibliotecaArchivos).where(eq(bibliotecaArchivos.id, id)).run()

  try {
    await unlink(join(process.cwd(), 'uploads', 'library', record.archivo))
  } catch {
    // file already gone, continue
  }

  return { ok: true }
})
