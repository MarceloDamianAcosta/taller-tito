import { db } from '../../db/index'
import { registroMantenimiento } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const { maquina_id, fecha, tipo, descripcion, responsable, proxima_fecha } = await readBody(event)

  if (!maquina_id) throw createError({ statusCode: 400, message: 'La máquina es obligatoria' })
  if (!fecha) throw createError({ statusCode: 400, message: 'La fecha es obligatoria' })
  if (!tipo || !['Preventivo', 'Correctivo'].includes(tipo)) {
    throw createError({ statusCode: 400, message: 'El tipo debe ser Preventivo o Correctivo' })
  }
  if (!descripcion || !descripcion.trim()) {
    throw createError({ statusCode: 400, message: 'La descripción es obligatoria' })
  }

  const result = db.insert(registroMantenimiento).values({
    maquinaId: Number(maquina_id),
    fecha,
    tipo,
    descripcion: descripcion.trim(),
    responsable: responsable?.trim() || null,
    proximaFecha: proxima_fecha || null
  }).run()

  const created = db
    .select()
    .from(registroMantenimiento)
    .where(eq(registroMantenimiento.id, Number(result.lastInsertRowid)))
    .get()

  return created
})
