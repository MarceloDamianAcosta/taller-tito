import { db } from '../../db/index'
import { maquinas } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID inválido' })

  const body = await readBody(event)
  const { nombre, descripcion, activo } = body

  const target = db.select().from(maquinas).where(eq(maquinas.id, id)).get()
  if (!target) throw createError({ statusCode: 404, message: 'Máquina no encontrada' })

  const updates: Record<string, unknown> = {}
  if (nombre !== undefined) {
    if (!nombre.trim()) throw createError({ statusCode: 400, message: 'El nombre es obligatorio' })
    updates.nombre = nombre.trim()
  }
  if (descripcion !== undefined) updates.descripcion = descripcion?.trim() || null
  if (activo !== undefined) updates.activo = activo

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, message: 'Sin cambios para aplicar' })
  }

  db.update(maquinas).set(updates).where(eq(maquinas.id, id)).run()

  const updated = db.select().from(maquinas).where(eq(maquinas.id, id)).get()
  return updated
})
