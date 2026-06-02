import { db } from '../../db/index'
import { operarios } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const { nombre, activo } = await readBody(event)

  if (!nombre || !nombre.trim()) {
    throw createError({ statusCode: 400, message: 'El nombre es obligatorio' })
  }

  const result = db.insert(operarios).values({
    nombre: nombre.trim(),
    activo: typeof activo === 'boolean' ? activo : true
  }).run()

  const created = db.select().from(operarios).where(eq(operarios.id, Number(result.lastInsertRowid))).get()
  return created
})
