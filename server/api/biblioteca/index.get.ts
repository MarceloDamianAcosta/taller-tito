import { db } from '../../db/index'
import { bibliotecaArchivos } from '../../db/schema'
import { desc, like } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const query = getQuery(event)
  const q = query.q as string | undefined

  let base = db.select().from(bibliotecaArchivos).$dynamic()

  if (q) {
    base = base.where(like(bibliotecaArchivos.nombre, `%${q}%`))
  }

  base = base.orderBy(desc(bibliotecaArchivos.createdAt))

  return base.all()
})
