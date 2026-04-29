import { db } from '../../../../db/index'
import { noConformidades } from '../../../../db/schema'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const id = Number(getRouterParam(event, 'id'))
  const ncId = Number(getRouterParam(event, 'ncId'))

  if (!id || !ncId) throw createError({ statusCode: 400, message: 'IDs inválidos' })

  const existing = db
    .select()
    .from(noConformidades)
    .where(and(eq(noConformidades.id, ncId), eq(noConformidades.otId, id)))
    .get()

  if (!existing) throw createError({ statusCode: 404, message: 'No conformidad no encontrada' })

  const body = await readBody(event)
  const updateData: Record<string, unknown> = {}

  if (body.fecha !== undefined) updateData.fecha = body.fecha
  if (body.problema !== undefined) updateData.problema = body.problema
  if (body.causa !== undefined) updateData.causa = body.causa || null
  if (body.solucion !== undefined) updateData.solucion = body.solucion || null
  if (body.accion_preventiva !== undefined) updateData.accionPreventiva = body.accion_preventiva || null

  if (Object.keys(updateData).length === 0) return existing

  db.update(noConformidades).set(updateData).where(eq(noConformidades.id, ncId)).run()
  return db.select().from(noConformidades).where(eq(noConformidades.id, ncId)).get()
})
