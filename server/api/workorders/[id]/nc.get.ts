import { db } from '../../../db/index'
import { noConformidades } from '../../../db/schema'
import { eq, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID inválido' })

  return db
    .select()
    .from(noConformidades)
    .where(eq(noConformidades.otId, id))
    .orderBy(desc(noConformidades.fecha))
    .all()
})
