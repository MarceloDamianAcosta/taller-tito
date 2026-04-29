import { db } from '../../../db/index'
import { controlCalidad } from '../../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID inválido' })

  const body = await readBody(event)

  if (!body.que_se_controla) throw createError({ statusCode: 400, message: '¿Qué se controló? es obligatorio' })
  if (!body.resultado) throw createError({ statusCode: 400, message: 'El resultado es obligatorio' })
  if (body.cumple_funcion === undefined || body.cumple_funcion === null) throw createError({ statusCode: 400, message: '¿Cumple función? es obligatorio' })
  if (body.hubo_reproceso === undefined || body.hubo_reproceso === null) throw createError({ statusCode: 400, message: '¿Hubo reproceso? es obligatorio' })
  if (!body.fecha_control) throw createError({ statusCode: 400, message: 'La fecha de control es obligatoria' })

  const values = {
    queSeControla: body.que_se_controla,
    instrumento: body.instrumento || null,
    resultado: body.resultado as 'OK' | 'NO OK',
    accion: body.accion || null,
    cumpleFuncion: Boolean(body.cumple_funcion),
    obsCalidad: body.obs_calidad || null,
    huboReproceso: Boolean(body.hubo_reproceso),
    fechaControl: body.fecha_control
  }

  const existing = db.select().from(controlCalidad).where(eq(controlCalidad.otId, id)).get()

  if (existing) {
    db.update(controlCalidad).set(values).where(eq(controlCalidad.id, existing.id)).run()
    return db.select().from(controlCalidad).where(eq(controlCalidad.id, existing.id)).get()
  } else {
    return db.insert(controlCalidad).values({ ...values, otId: id }).returning().get()
  }
})
