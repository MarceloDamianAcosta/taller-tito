import { db } from '../../db/index'
import { maquinas } from '../../db/schema'
import { eq, asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  return db
    .select()
    .from(maquinas)
    .where(eq(maquinas.activo, true))
    .orderBy(asc(maquinas.nombre))
    .all()
})
