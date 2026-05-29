import { db } from '../../db/index'
import { ordenTrabajo, controlCalidad, otMaquinas, otHistorial } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID inválido' })

  const existing = db.select().from(ordenTrabajo).where(eq(ordenTrabajo.nroOt, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Orden de trabajo no encontrada' })

  const body = await readBody(event)
  const { nro_ot, created_at, force, operario_id, ...fields } = body

  // Cualquier cambio de estado (incluido anular y reactivar) requiere operario.
  const estadoChanged = fields.estado !== undefined && fields.estado !== existing.estado
  const operarioId = operario_id != null ? Number(operario_id) : null
  if (estadoChanged && !operarioId) {
    throw createError({ statusCode: 400, message: 'Indicá el operario que hizo el trabajo' })
  }

  if (fields.estado === 'Entregado' && force !== true) {
    const cc = db.select().from(controlCalidad).where(eq(controlCalidad.otId, id)).get()
    if (!cc) {
      throw createError({
        statusCode: 409,
        data: { warning: 'sin_control_calidad', message: 'Sin control de calidad' }
      })
    }
  }

  if (fields.estado === 'Anulada' && !fields.motivo_anulacion?.trim()) {
    throw createError({ statusCode: 400, message: 'Indicá el motivo de anulación' })
  }

  if (fields.estado !== undefined && fields.estado !== 'Anulada' && existing.estado === 'Anulada' && fields.motivo_anulacion === undefined) {
    fields.motivo_anulacion = null
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
  if (fields.que_se_controla !== undefined) updateData.queSeControla = fields.que_se_controla?.trim() || null
  if (fields.fecha_ingreso !== undefined) updateData.fechaIngreso = fields.fecha_ingreso
  if (fields.fecha_prometida !== undefined) updateData.fechaPrometida = fields.fecha_prometida || null
  if (fields.fecha_inicio !== undefined) updateData.fechaInicio = fields.fecha_inicio || null
  if (fields.fecha_finalizacion !== undefined) updateData.fechaFinalizacion = fields.fecha_finalizacion || null
  if (fields.fecha_entrega !== undefined) updateData.fechaEntrega = fields.fecha_entrega || null
  if (fields.tiempo_estimado_hs !== undefined) updateData.tiempoEstimadoHs = fields.tiempo_estimado_hs ? Number(fields.tiempo_estimado_hs) : null
  if (fields.tiempo_real_hs !== undefined) updateData.tiempoRealHs = fields.tiempo_real_hs ? Number(fields.tiempo_real_hs) : null
  if (fields.motivo_retraso !== undefined) updateData.motivoRetraso = fields.motivo_retraso || null
  if (fields.estado !== undefined) updateData.estado = fields.estado
  if (fields.motivo_anulacion !== undefined) updateData.motivoAnulacion = fields.motivo_anulacion?.trim() || null
  if (fields.observaciones !== undefined) updateData.observaciones = fields.observaciones || null
  if (fields.cliente_conforme !== undefined) updateData.clienteConforme = fields.cliente_conforme

  if (Array.isArray(fields.maquina_ids)) {
    const uniqueIds: number[] = Array.from(new Set(
      (fields.maquina_ids as unknown[])
        .map(v => Number(v))
        .filter((n): n is number => Number.isInteger(n) && n > 0)
    ))
    db.delete(otMaquinas).where(eq(otMaquinas.otId, id)).run()
    if (uniqueIds.length > 0) {
      db.insert(otMaquinas).values(uniqueIds.map(mid => ({ otId: id, maquinaId: mid }))).run()
    }
  }

  if (Object.keys(updateData).length === 0) {
    return db.select().from(ordenTrabajo).where(eq(ordenTrabajo.nroOt, id)).get()
  }

  db.update(ordenTrabajo).set(updateData).where(eq(ordenTrabajo.nroOt, id)).run()

  if (estadoChanged) {
    db.insert(otHistorial).values({
      otId: id,
      userId: session.user.id,
      operarioId,
      estadoAnterior: existing.estado,
      estadoNuevo: fields.estado,
      fecha: new Date().toISOString()
    }).run()
  }

  return db.select().from(ordenTrabajo).where(eq(ordenTrabajo.nroOt, id)).get()
})
