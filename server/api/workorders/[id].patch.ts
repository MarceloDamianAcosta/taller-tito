import { db } from '../../db/index'
import { ordenTrabajo, controlCalidad, otMaquinas } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID inválido' })

  const existing = db.select().from(ordenTrabajo).where(eq(ordenTrabajo.nroOt, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Orden de trabajo no encontrada' })

  const body = await readBody(event)
  const { nro_ot, created_at, force, ...fields } = body

  if (fields.estado === 'Entregado' && force !== true) {
    const cc = db.select().from(controlCalidad).where(eq(controlCalidad.otId, id)).get()
    if (!cc) {
      throw createError({
        statusCode: 409,
        data: { warning: 'sin_control_calidad', message: 'Sin control de calidad' }
      })
    }
  }

  const fechaEntrega = fields.fecha_entrega ?? existing.fechaEntrega
  const fechaPrometida = fields.fecha_prometida ?? existing.fechaPrometida
  const motivoRetraso = fields.motivo_retraso ?? existing.motivoRetraso

  if (fechaEntrega && fechaPrometida && fechaEntrega > fechaPrometida && !motivoRetraso) {
    throw createError({ statusCode: 400, message: 'Se requiere motivo de retraso cuando la fecha de entrega supera la fecha prometida' })
  }

  const updateData: Record<string, unknown> = {}
  if (fields.cliente_id !== undefined) updateData.clienteId = Number(fields.cliente_id)
  if (fields.descripcion !== undefined) updateData.descripcion = fields.descripcion
  if (fields.material !== undefined) updateData.material = fields.material || null
  if (fields.cantidad !== undefined) updateData.cantidad = fields.cantidad ? Number(fields.cantidad) : null
  if (fields.fecha_ingreso !== undefined) updateData.fechaIngreso = fields.fecha_ingreso
  if (fields.fecha_prometida !== undefined) updateData.fechaPrometida = fields.fecha_prometida || null
  if (fields.fecha_inicio !== undefined) updateData.fechaInicio = fields.fecha_inicio || null
  if (fields.fecha_finalizacion !== undefined) updateData.fechaFinalizacion = fields.fecha_finalizacion || null
  if (fields.fecha_entrega !== undefined) updateData.fechaEntrega = fields.fecha_entrega || null
  if (fields.tiempo_estimado_hs !== undefined) updateData.tiempoEstimadoHs = fields.tiempo_estimado_hs ? Number(fields.tiempo_estimado_hs) : null
  if (fields.tiempo_real_hs !== undefined) updateData.tiempoRealHs = fields.tiempo_real_hs ? Number(fields.tiempo_real_hs) : null
  if (fields.motivo_retraso !== undefined) updateData.motivoRetraso = fields.motivo_retraso || null
  if (fields.estado !== undefined) updateData.estado = fields.estado
  if (fields.observaciones !== undefined) updateData.observaciones = fields.observaciones || null
  if (fields.cliente_conforme !== undefined) updateData.clienteConforme = fields.cliente_conforme

  if (Array.isArray(fields.maquina_ids)) {
    const uniqueIds = [...new Set(fields.maquina_ids.map(Number).filter((n: number) => Number.isInteger(n) && n > 0))]
    db.delete(otMaquinas).where(eq(otMaquinas.otId, id)).run()
    if (uniqueIds.length > 0) {
      db.insert(otMaquinas).values(uniqueIds.map(mid => ({ otId: id, maquinaId: mid }))).run()
    }
  }

  if (Object.keys(updateData).length === 0) {
    return db.select().from(ordenTrabajo).where(eq(ordenTrabajo.nroOt, id)).get()
  }

  db.update(ordenTrabajo).set(updateData).where(eq(ordenTrabajo.nroOt, id)).run()
  return db.select().from(ordenTrabajo).where(eq(ordenTrabajo.nroOt, id)).get()
})
