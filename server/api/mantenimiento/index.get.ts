import { db } from '../../db/index'
import { registroMantenimiento, maquinas } from '../../db/schema'
import { eq, and, gte, lte, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const query = getQuery(event)
  const maquinaId = query.maquina_id ? Number(query.maquina_id) : null
  const tipo = query.tipo as string | undefined
  const desde = query.desde as string | undefined
  const hasta = query.hasta as string | undefined

  const conditions = []
  if (maquinaId) conditions.push(eq(registroMantenimiento.maquinaId, maquinaId))
  if (tipo && (tipo === 'Preventivo' || tipo === 'Correctivo')) {
    conditions.push(eq(registroMantenimiento.tipo, tipo))
  }
  if (desde) conditions.push(gte(registroMantenimiento.fecha, desde))
  if (hasta) conditions.push(lte(registroMantenimiento.fecha, hasta))

  const rows = db
    .select({
      id: registroMantenimiento.id,
      maquinaId: registroMantenimiento.maquinaId,
      fecha: registroMantenimiento.fecha,
      tipo: registroMantenimiento.tipo,
      descripcion: registroMantenimiento.descripcion,
      responsable: registroMantenimiento.responsable,
      proximaFecha: registroMantenimiento.proximaFecha,
      maquinaNombre: maquinas.nombre
    })
    .from(registroMantenimiento)
    .leftJoin(maquinas, eq(registroMantenimiento.maquinaId, maquinas.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(registroMantenimiento.fecha))
    .all()

  return rows
})
