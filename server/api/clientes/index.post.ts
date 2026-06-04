import { db } from '../../db/index'
import { clientes } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const { nombre, telefonos, emails, notas, activo } = await readBody(event)

  if (!nombre || !nombre.trim()) {
    throw createError({ statusCode: 400, message: 'El nombre es obligatorio' })
  }

  const result = db.insert(clientes).values({
    nombre: nombre.trim(),
    telefonos: cleanList(telefonos),
    emails: cleanList(emails),
    notas: notas?.trim() || null,
    activo: typeof activo === 'boolean' ? activo : true
  }).run()

  const created = db.select().from(clientes).where(eq(clientes.id, Number(result.lastInsertRowid))).get()
  return created
})
