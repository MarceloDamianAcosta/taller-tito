import { db } from '../../db/index'
import { ordenTrabajo, otMaquinas, otArchivos, materiales, controlCalidad, noConformidades } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID inválido' })

  const existing = db.select().from(ordenTrabajo).where(eq(ordenTrabajo.nroOt, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Orden de trabajo no encontrada' })

  db.delete(otMaquinas).where(eq(otMaquinas.otId, id)).run()
  db.delete(otArchivos).where(eq(otArchivos.otId, id)).run()
  db.delete(materiales).where(eq(materiales.otId, id)).run()
  db.delete(controlCalidad).where(eq(controlCalidad.otId, id)).run()
  db.delete(noConformidades).where(eq(noConformidades.otId, id)).run()
  db.delete(ordenTrabajo).where(eq(ordenTrabajo.nroOt, id)).run()

  return { ok: true }
})
