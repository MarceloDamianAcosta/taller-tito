import { db } from '../../../../db/index'
import { otArchivos } from '../../../../db/schema'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const id = Number(getRouterParam(event, 'id'))
  const archivoId = Number(getRouterParam(event, 'archivoId'))

  if (!id || !archivoId) throw createError({ statusCode: 400, message: 'IDs inválidos' })

  const existing = db
    .select()
    .from(otArchivos)
    .where(and(eq(otArchivos.id, archivoId), eq(otArchivos.otId, id)))
    .get()

  if (!existing) throw createError({ statusCode: 404, message: 'Archivo no encontrado en esta OT' })

  db.delete(otArchivos).where(and(eq(otArchivos.id, archivoId), eq(otArchivos.otId, id))).run()

  return { success: true }
})
