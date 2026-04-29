import { db } from '../../db/index'
import { registroMantenimiento } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID inválido' })

  const body = await readBody(event)
  const { maquina_id, fecha, tipo, descripcion, responsable, proxima_fecha } = body

  const target = db.select().from(registroMantenimiento).where(eq(registroMantenimiento.id, id)).get()
  if (!target) throw createError({ statusCode: 404, message: 'Registro no encontrado' })

  const updates: Record<string, unknown> = {}
  if (maquina_id !== undefined) updates.maquinaId = Number(maquina_id)
  if (fecha !== undefined) updates.fecha = fecha
  if (tipo !== undefined) {
    if (!['Preventivo', 'Correctivo'].includes(tipo)) {
      throw createError({ statusCode: 400, message: 'Tipo inválido' })
    }
    updates.tipo = tipo
  }
  if (descripcion !== undefined) {
    if (!descripcion.trim()) throw createError({ statusCode: 400, message: 'La descripción es obligatoria' })
    updates.descripcion = descripcion.trim()
  }
  if (responsable !== undefined) updates.responsable = responsable?.trim() || null
  if (proxima_fecha !== undefined) updates.proximaFecha = proxima_fecha || null

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, message: 'Sin cambios para aplicar' })
  }

  db.update(registroMantenimiento).set(updates).where(eq(registroMantenimiento.id, id)).run()

  const updated = db.select().from(registroMantenimiento).where(eq(registroMantenimiento.id, id)).get()
  return updated
})
