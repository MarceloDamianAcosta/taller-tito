import { db } from '../../../db/index'
import { otHistorial, users, operarios } from '../../../db/schema'
import { eq, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID inválido' })

  return db
    .select({
      id: otHistorial.id,
      estadoAnterior: otHistorial.estadoAnterior,
      estadoNuevo: otHistorial.estadoNuevo,
      fecha: otHistorial.fecha,
      operarioNombre: operarios.nombre,
      usuario: users.username
    })
    .from(otHistorial)
    .leftJoin(operarios, eq(otHistorial.operarioId, operarios.id))
    .leftJoin(users, eq(otHistorial.userId, users.id))
    .where(eq(otHistorial.otId, id))
    .orderBy(desc(otHistorial.fecha), desc(otHistorial.id))
    .all()
})
