import { db } from '../../db/index'
import { ordenTrabajo, otMaquinas } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const body = await readBody(event)
  const { cliente_id, descripcion, material, cantidad, maquina_ids, fecha_ingreso, fecha_prometida, tiempo_estimado_hs, observaciones } = body

  if (!cliente_id) throw createError({ statusCode: 400, message: 'El cliente es obligatorio' })
  if (!descripcion?.trim()) throw createError({ statusCode: 400, message: 'La descripción es obligatoria' })
  if (!fecha_ingreso) throw createError({ statusCode: 400, message: 'La fecha de ingreso es obligatoria' })

  const result = db.insert(ordenTrabajo).values({
    clienteId: Number(cliente_id),
    descripcion: descripcion.trim(),
    material: material?.trim() || null,
    cantidad: cantidad ? Number(cantidad) : null,
    fechaIngreso: fecha_ingreso,
    fechaPrometida: fecha_prometida || null,
    tiempoEstimadoHs: tiempo_estimado_hs ? Number(tiempo_estimado_hs) : null,
    observaciones: observaciones?.trim() || null,
    estado: 'Recepcionado'
  }).run()

  const otId = Number(result.lastInsertRowid)

  if (Array.isArray(maquina_ids) && maquina_ids.length > 0) {
    const uniqueIds = [...new Set(maquina_ids.map(Number).filter(n => Number.isInteger(n) && n > 0))]
    if (uniqueIds.length > 0) {
      db.insert(otMaquinas).values(uniqueIds.map(mid => ({ otId, maquinaId: mid }))).run()
    }
  }

  const created = db.select().from(ordenTrabajo).where(eq(ordenTrabajo.nroOt, otId)).get()
  return created
})
