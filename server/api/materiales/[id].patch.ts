import { db } from '../../db/index'
import { catalogoMateriales } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID inválido' })

  const existing = db.select().from(catalogoMateriales).where(eq(catalogoMateriales.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Material no encontrado' })

  const body = await readBody(event)
  const { nombre, unidad, tipo, notas, activo } = body

  const validUnidades = ['kg', 'cm2', 'mts', 'mts2', 'lts'] as const
  const updates: Record<string, unknown> = {}

  if (nombre !== undefined) {
    if (typeof nombre !== 'string' || nombre.trim() === '') {
      throw createError({ statusCode: 400, message: 'El nombre no puede estar vacío' })
    }
    updates.nombre = nombre.trim()
  }

  if (unidad !== undefined) {
    if (!validUnidades.includes(unidad)) {
      throw createError({ statusCode: 400, message: 'Unidad inválida' })
    }
    updates.unidad = unidad
  }

  if (tipo !== undefined) updates.tipo = tipo?.trim() || null
  if (notas !== undefined) updates.notas = notas?.trim() || null
  if (activo !== undefined) updates.activo = activo

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, message: 'Sin cambios para aplicar' })
  }

  const result = db.update(catalogoMateriales).set(updates).where(eq(catalogoMateriales.id, id)).returning().get()
  return result
})
