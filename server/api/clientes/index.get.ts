import { db } from '../../db/index'
import { clientes } from '../../db/schema'
import { eq, like, asc, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const query = getQuery(event)
  const activoParam = query.activo as string | undefined
  const q = query.q as string | undefined

  let base = db.select().from(clientes).$dynamic()

  const conditions = []
  if (activoParam === 'true') conditions.push(eq(clientes.activo, true))
  else if (activoParam === 'false') conditions.push(eq(clientes.activo, false))
  if (q) conditions.push(like(clientes.nombre, `%${q}%`))
  if (conditions.length) base = base.where(conditions.length === 1 ? conditions[0] : and(...conditions))

  return base.orderBy(asc(clientes.nombre)).all()
})
