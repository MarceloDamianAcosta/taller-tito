import { db } from '../../db/index'
import { ordenTrabajo, clientes, maquinas, otMaquinas } from '../../db/schema'
import { eq, like, and, asc, sql, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const query = getQuery(event)
  const estado = query.estado as string | undefined
  const q = query.q as string | undefined
  const clienteId = query.cliente_id ? Number(query.cliente_id) : undefined

  const conditions = []
  if (estado) conditions.push(eq(ordenTrabajo.estado, estado as 'Recepcionado' | 'En proceso' | 'Finalizado en stock' | 'Entregado'))
  if (q) conditions.push(like(ordenTrabajo.descripcion, `%${q}%`))
  if (clienteId) conditions.push(eq(ordenTrabajo.clienteId, clienteId))

  let base = db
    .select({
      nroOt: ordenTrabajo.nroOt,
      descripcion: ordenTrabajo.descripcion,
      estado: ordenTrabajo.estado,
      fechaIngreso: ordenTrabajo.fechaIngreso,
      fechaPrometida: ordenTrabajo.fechaPrometida,
      fechaEntrega: ordenTrabajo.fechaEntrega,
      clienteNombre: clientes.nombre
    })
    .from(ordenTrabajo)
    .leftJoin(clientes, eq(ordenTrabajo.clienteId, clientes.id))
    .$dynamic()

  if (conditions.length) base = base.where(conditions.length === 1 ? conditions[0] : and(...conditions))

  const rows = base.orderBy(sql`${ordenTrabajo.fechaPrometida} IS NULL ASC`, asc(ordenTrabajo.fechaPrometida)).all()

  const otIds = rows.map(r => r.nroOt)
  const maquinasPorOt = new Map<number, { id: number, nombre: string }[]>()
  if (otIds.length > 0) {
    const links = db
      .select({ otId: otMaquinas.otId, maquinaId: maquinas.id, nombre: maquinas.nombre })
      .from(otMaquinas)
      .leftJoin(maquinas, eq(otMaquinas.maquinaId, maquinas.id))
      .where(inArray(otMaquinas.otId, otIds))
      .all()
    for (const l of links) {
      if (!l.maquinaId || !l.nombre) continue
      const arr = maquinasPorOt.get(l.otId) ?? []
      arr.push({ id: l.maquinaId, nombre: l.nombre })
      maquinasPorOt.set(l.otId, arr)
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  return rows.map(r => {
    const ms = maquinasPorOt.get(r.nroOt) ?? []
    return {
      ...r,
      maquinas: ms,
      maquinasNombres: ms.map(m => m.nombre).join(', '),
      isOverdue: !!(r.fechaPrometida && r.fechaPrometida < today && r.estado !== 'Entregado')
    }
  })
})
