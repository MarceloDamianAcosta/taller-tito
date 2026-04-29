import { db } from '../../db/index'
import { ordenTrabajo } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const body = await readBody(event)
  const { cliente_id, descripcion, material, cantidad, maquina_id, fecha_ingreso, fecha_prometida, tiempo_estimado_hs, observaciones } = body

  if (!cliente_id) throw createError({ statusCode: 400, message: 'El cliente es obligatorio' })
  if (!descripcion?.trim()) throw createError({ statusCode: 400, message: 'La descripción es obligatoria' })
  if (!fecha_ingreso) throw createError({ statusCode: 400, message: 'La fecha de ingreso es obligatoria' })
  if (!fecha_prometida) throw createError({ statusCode: 400, message: 'La fecha prometida es obligatoria' })

  const result = db.insert(ordenTrabajo).values({
    clienteId: Number(cliente_id),
    descripcion: descripcion.trim(),
    material: material?.trim() || null,
    cantidad: cantidad ? Number(cantidad) : null,
    maquinaId: maquina_id ? Number(maquina_id) : null,
    fechaIngreso: fecha_ingreso,
    fechaPrometida: fecha_prometida,
    tiempoEstimadoHs: tiempo_estimado_hs ? Number(tiempo_estimado_hs) : null,
    observaciones: observaciones?.trim() || null,
    estado: 'Recepcionado'
  }).run()

  const created = db.select().from(ordenTrabajo).where(eq(ordenTrabajo.nroOt, Number(result.lastInsertRowid))).get()
  return created
})
