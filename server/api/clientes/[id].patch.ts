import { db } from '../../db/index'
import { clientes } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID inválido' })

  const body = await readBody(event)
  const { nombre, telefonos, emails, notas, activo } = body

  const target = db.select().from(clientes).where(eq(clientes.id, id)).get()
  if (!target) throw createError({ statusCode: 404, message: 'Cliente no encontrado' })

  const updates: Record<string, unknown> = {}
  if (nombre !== undefined) {
    if (!nombre.trim()) throw createError({ statusCode: 400, message: 'El nombre es obligatorio' })
    updates.nombre = nombre.trim()
  }
  if (telefonos !== undefined) updates.telefonos = cleanList(telefonos)
  if (emails !== undefined) updates.emails = cleanList(emails)
  if (notas !== undefined) updates.notas = notas?.trim() || null
  if (activo !== undefined) updates.activo = activo

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, message: 'Sin cambios para aplicar' })
  }

  db.update(clientes).set(updates).where(eq(clientes.id, id)).run()

  const updated = db.select().from(clientes).where(eq(clientes.id, id)).get()
  return updated
})
