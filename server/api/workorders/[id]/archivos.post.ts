import { db } from '../../../db/index'
import { otArchivos, bibliotecaArchivos } from '../../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID inválido' })

  const body = await readBody(event)
  const { biblioteca_ids } = body

  if (!Array.isArray(biblioteca_ids) || biblioteca_ids.length === 0) {
    throw createError({ statusCode: 400, message: 'Se requiere al menos un archivo' })
  }

  const existing = db
    .select({ bibliotecaId: otArchivos.bibliotecaId })
    .from(otArchivos)
    .where(eq(otArchivos.otId, id))
    .all()
    .map(r => r.bibliotecaId)

  const toInsert = biblioteca_ids.filter((bid: number) => !existing.includes(bid))

  if (toInsert.length > 0) {
    db.insert(otArchivos).values(
      toInsert.map((bid: number) => ({ otId: id, bibliotecaId: bid }))
    ).run()
  }

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
