import { db } from '../../db/index'
import { maquinas, registroMantenimiento } from '../../db/schema'
import { eq, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID inválido' })

  const machine = db.select().from(maquinas).where(eq(maquinas.id, id)).get()
  if (!machine) throw createError({ statusCode: 404, message: 'Máquina no encontrada' })

  const records = db
    .select()
    .from(registroMantenimiento)
    .where(eq(registroMantenimiento.maquinaId, id))
    .orderBy(desc(registroMantenimiento.fecha))
    .all()

  return { ...machine, registros: records }
})
