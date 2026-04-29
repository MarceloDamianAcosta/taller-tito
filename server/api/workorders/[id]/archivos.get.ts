import { db } from '../../../db/index'
import { otArchivos, bibliotecaArchivos } from '../../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID inválido' })

  return db
    .select({
      id: otArchivos.id,
      otId: otArchivos.otId,
      bibliotecaId: otArchivos.bibliotecaId,
      nombre: bibliotecaArchivos.nombre,
      archivo: bibliotecaArchivos.archivo,
      tipo: bibliotecaArchivos.tipo,
      createdAt: bibliotecaArchivos.createdAt
    })
    .from(otArchivos)
    .leftJoin(bibliotecaArchivos, eq(otArchivos.bibliotecaId, bibliotecaArchivos.id))
    .where(eq(otArchivos.otId, id))
    .all()
})
