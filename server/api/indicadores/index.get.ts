import { db } from '../../db/index'
import { ordenTrabajo, controlCalidad, noConformidades, clientes, registroMantenimiento } from '../../db/schema'
import { eq, and, isNotNull, count, gte, ne } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const query = getQuery(event)
  const periodo = (query.periodo as string) || '90d'

  const today = new Date()
  let desde: string | undefined
  if (periodo === '30d') {
    const d = new Date(today)
    d.setDate(d.getDate() - 30)
    desde = d.toISOString().slice(0, 10)
  } else if (periodo === '90d') {
    const d = new Date(today)
    d.setDate(d.getDate() - 90)
    desde = d.toISOString().slice(0, 10)
  } else if (periodo === '12m') {
    const d = new Date(today)
    d.setFullYear(d.getFullYear() - 1)
    desde = d.toISOString().slice(0, 10)
  }

  const allOts = db.select({
    nroOt: ordenTrabajo.nroOt,
    fechaFinalizacion: ordenTrabajo.fechaFinalizacion,
    fechaPrometida: ordenTrabajo.fechaPrometida,
    estado: ordenTrabajo.estado,
    clienteId: ordenTrabajo.clienteId
  }).from(ordenTrabajo)
    .where(and(ne(ordenTrabajo.estado, 'Anulada'), desde ? gte(ordenTrabajo.createdAt, desde) : undefined))
    .all()

  const conEntrega = allOts.filter(o => o.fechaFinalizacion)
  const aTiempo = conEntrega.filter(o => !o.fechaPrometida || o.fechaFinalizacion! <= o.fechaPrometida)
  const entregasPorcentaje = conEntrega.length > 0 ? Math.round((aTiempo.length / conEntrega.length) * 100) : 0

  const otsConNcIds = new Set(
    db.select({ otId: noConformidades.otId }).from(noConformidades)
      .where(desde ? gte(noConformidades.fecha, desde) : undefined)
      .all().map(r => r.otId)
  )

  const totalNc = db.select({ c: count() }).from(noConformidades)
    .where(desde ? gte(noConformidades.fecha, desde) : undefined).get()?.c ?? 0

  const ncPorcentaje = allOts.length > 0 ? Math.round((otsConNcIds.size / allOts.length) * 100) : 0

  const reprocesos = db.select({ c: count() }).from(controlCalidad)
    .where(and(
      eq(controlCalidad.huboReproceso, true),
      desde ? gte(controlCalidad.fechaControl, desde) : undefined
    )).get()?.c ?? 0

  const tiemposRows = db.select({
    est: ordenTrabajo.tiempoEstimadoHs,
    real: ordenTrabajo.tiempoRealHs
  }).from(ordenTrabajo)
    .where(and(isNotNull(ordenTrabajo.tiempoEstimadoHs), isNotNull(ordenTrabajo.tiempoRealHs), desde ? gte(ordenTrabajo.createdAt, desde) : undefined))
    .all()

  const desviacionHoras = tiemposRows.length > 0
    ? Math.round(tiemposRows.reduce((sum, r) => sum + (r.real! - r.est!), 0) / tiemposRows.length * 10) / 10
    : null

  const estados = ['Recepcionado', 'En proceso', 'Finalizado', 'Entregado']
  const otsPorEstado = estados.map(estado => ({
    estado,
    cantidad: allOts.filter(o => o.estado === estado).length
  }))

  const clientesRaw = db.select({ clienteId: ordenTrabajo.clienteId, nombre: clientes.nombre })
    .from(ordenTrabajo)
    .leftJoin(clientes, eq(ordenTrabajo.clienteId, clientes.id))
    .where(desde ? gte(ordenTrabajo.createdAt, desde) : undefined)
    .all()

  const clienteMap = new Map<string, number>()
  for (const r of clientesRaw) {
    const k = r.nombre ?? 'Desconocido'
    clienteMap.set(k, (clienteMap.get(k) ?? 0) + 1)
  }
  const topClientes = Array.from(clienteMap.entries())
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))

  const mantRecords = db.select({ tipo: registroMantenimiento.tipo }).from(registroMantenimiento)
    .where(desde ? gte(registroMantenimiento.fecha, desde) : undefined).all()
  const preventivo = mantRecords.filter(r => r.tipo === 'Preventivo').length
  const correctivo = mantRecords.filter(r => r.tipo === 'Correctivo').length

  return {
    periodo,
    entregas: { porcentaje: entregasPorcentaje, aTiempo: aTiempo.length, total: conEntrega.length },
    noConformidades: { porcentaje: ncPorcentaje, conNc: otsConNcIds.size, totalOts: allOts.length, totalNc },
    reprocesos,
    desviacionHoras,
    otsPorEstado,
    topClientes,
    mantenimiento: { preventivo, correctivo }
  }
})
