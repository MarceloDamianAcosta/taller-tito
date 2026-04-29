import { db } from '../../db/index'
import { maquinas } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const { nombre, descripcion } = await readBody(event)

  if (!nombre || !nombre.trim()) {
    throw createError({ statusCode: 400, message: 'El nombre es obligatorio' })
  }

  const result = db.insert(maquinas).values({
    nombre: nombre.trim(),
    descripcion: descripcion?.trim() || null
  }).run()

  const created = db.select().from(maquinas).where(eq(maquinas.id, Number(result.lastInsertRowid))).get()
  return created
})
