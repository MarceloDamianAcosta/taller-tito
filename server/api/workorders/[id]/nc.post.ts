import { db } from '../../../db/index'
import { noConformidades } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID inválido' })

  const body = await readBody(event)

  if (!body.fecha) throw createError({ statusCode: 400, message: 'La fecha es obligatoria' })
  if (!body.problema) throw createError({ statusCode: 400, message: 'El problema es obligatorio' })

  return db.insert(noConformidades).values({
    otId: id,
    fecha: body.fecha,
    problema: body.problema,
    causa: body.causa || null,
    solucion: body.solucion || null,
    accionPreventiva: body.accion_preventiva || null
  }).returning().get()
})
