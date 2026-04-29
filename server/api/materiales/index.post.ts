import { db } from '../../db/index'
import { catalogoMateriales } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const body = await readBody(event)
  const { nombre, unidad, tipo, notas } = body

  if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
    throw createError({ statusCode: 400, message: 'El nombre es obligatorio' })
  }

  const validUnidades = ['kg', 'cm2', 'mts', 'mts2', 'lts'] as const
  if (!unidad || !validUnidades.includes(unidad)) {
    throw createError({ statusCode: 400, message: 'Unidad inválida' })
  }

  const result = db.insert(catalogoMateriales).values({
    nombre: nombre.trim(),
    unidad,
    tipo: tipo?.trim() || null,
    notas: notas?.trim() || null
  }).returning().get()

  return result
})
