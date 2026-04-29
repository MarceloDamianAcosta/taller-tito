import { db } from '../../db/index'
import { ordenTrabajo, clientes, maquinas } from '../../db/schema'
import { eq, like, and, asc } from 'drizzle-orm'

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
      clienteNombre: clientes.nombre,
      maquinaNombre: maquinas.nombre
    })
    .from(ordenTrabajo)
    .leftJoin(clientes, eq(ordenTrabajo.clienteId, clientes.id))
    .leftJoin(maquinas, eq(ordenTrabajo.maquinaId, maquinas.id))
    .$dynamic()

  if (conditions.length) base = base.where(conditions.length === 1 ? conditions[0] : and(...conditions))

  const rows = base.orderBy(asc(ordenTrabajo.fechaPrometida)).all()

  const today = new Date().toISOString().slice(0, 10)
  return rows.map(r => ({
    ...r,
    isOverdue: !!(r.fechaPrometida && r.fechaPrometida < today && r.estado !== 'Entregado')
  }))
})
