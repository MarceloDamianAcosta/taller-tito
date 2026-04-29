import { db } from '../../db/index'
import { ordenTrabajo, controlCalidad, noConformidades, registroMantenimiento, clientes, maquinas } from '../../db/schema'
import { eq, ne, and, isNotNull, count, lt } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const today = new Date().toISOString().slice(0, 10)

  const otsActivas = db.select({ c: count() }).from(ordenTrabajo).where(ne(ordenTrabajo.estado, 'Entregado')).get()?.c ?? 0
  const otsTotal = db.select({ c: count() }).from(ordenTrabajo).get()?.c ?? 0

  const entregasRows = db.select({ eTiempo: ordenTrabajo.fechaEntrega, ePrometida: ordenTrabajo.fechaPrometida })
    .from(ordenTrabajo).where(isNotNull(ordenTrabajo.fechaEntrega)).all()
  const entregasTotal = entregasRows.length
  const entregasATiempo = entregasRows.filter(r => r.eTiempo! <= r.ePrometida).length
  const entregasPorcentaje = entregasTotal > 0 ? Math.round((entregasATiempo / entregasTotal) * 100) : 0

  const noConformidadesTotal = db.select({ c: count() }).from(noConformidades).get()?.c ?? 0
  const reprocesosTotal = db.select({ c: count() }).from(controlCalidad).where(eq(controlCalidad.huboReproceso, true)).get()?.c ?? 0

  const otsEnCurso = db.select({
    nroOt: ordenTrabajo.nroOt,
    descripcion: ordenTrabajo.descripcion,
    estado: ordenTrabajo.estado,
    fechaPrometida: ordenTrabajo.fechaPrometida,
    clienteNombre: clientes.nombre
  }).from(ordenTrabajo)
    .leftJoin(clientes, eq(ordenTrabajo.clienteId, clientes.id))
    .where(ne(ordenTrabajo.estado, 'Entregado'))
    .orderBy(ordenTrabajo.fechaPrometida)
    .limit(10).all()
    .map(ot => ({ ...ot, isOverdue: !!ot.fechaPrometida && ot.fechaPrometida < today }))

  const proximosMantenimientos = db.select({
    id: registroMantenimiento.id,
    tipo: registroMantenimiento.tipo,
    proximaFecha: registroMantenimiento.proximaFecha,
    maquinaNombre: maquinas.nombre
  }).from(registroMantenimiento)
    .leftJoin(maquinas, eq(registroMantenimiento.maquinaId, maquinas.id))
    .where(isNotNull(registroMantenimiento.proximaFecha))
    .orderBy(registroMantenimiento.proximaFecha)
    .limit(5).all()

  const otsVencidas = db.select({ c: count() }).from(ordenTrabajo)
    .where(and(lt(ordenTrabajo.fechaPrometida, today), ne(ordenTrabajo.estado, 'Entregado'))).get()?.c ?? 0
  const mantenimientosVencidos = db.select({ c: count() }).from(registroMantenimiento)
    .where(and(isNotNull(registroMantenimiento.proximaFecha), lt(registroMantenimiento.proximaFecha, today))).get()?.c ?? 0

  return {
    kpis: { otsActivas, otsTotal, entregasPorcentaje, entregasATiempo, entregasTotal, noConformidadesTotal, reprocesosTotal },
    otsEnCurso,
    proximosMantenimientos,
    alertas: { otsVencidas, mantenimientosVencidos }
  }
})
