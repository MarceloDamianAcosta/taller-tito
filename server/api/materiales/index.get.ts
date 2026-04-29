import { db } from '../../db/index'
import { catalogoMateriales } from '../../db/schema'
import { eq, like, asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const query = getQuery(event)
  const activoParam = query.activo as string | undefined
  const q = query.q as string | undefined

  let base = db.select().from(catalogoMateriales).$dynamic()

  if (activoParam === 'true') {
    base = base.where(eq(catalogoMateriales.activo, true))
  } else if (activoParam === 'false') {
    base = base.where(eq(catalogoMateriales.activo, false))
  }

  if (q) {
    base = base.where(like(catalogoMateriales.nombre, `%${q}%`))
  }

  base = base.orderBy(asc(catalogoMateriales.nombre))

  return base.all()
})
