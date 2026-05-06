import { db } from '../../db/index'
import { ordenTrabajo, clientes, maquinas, materiales, catalogoMateriales, otArchivos, bibliotecaArchivos, otMaquinas } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID inválido' })

  const ot = db
    .select({
      nroOt: ordenTrabajo.nroOt,
      clienteId: ordenTrabajo.clienteId,
      clienteNombre: clientes.nombre,
      clienteTelefono: clientes.telefono,
      descripcion: ordenTrabajo.descripcion,
      material: ordenTrabajo.material,
      cantidad: ordenTrabajo.cantidad,
      fechaIngreso: ordenTrabajo.fechaIngreso,
      fechaPrometida: ordenTrabajo.fechaPrometida,
      fechaInicio: ordenTrabajo.fechaInicio,
      fechaFinalizacion: ordenTrabajo.fechaFinalizacion,
      fechaEntrega: ordenTrabajo.fechaEntrega,
      tiempoEstimadoHs: ordenTrabajo.tiempoEstimadoHs,
      tiempoRealHs: ordenTrabajo.tiempoRealHs,
      motivoRetraso: ordenTrabajo.motivoRetraso,
      estado: ordenTrabajo.estado,
      motivoAnulacion: ordenTrabajo.motivoAnulacion,
      observaciones: ordenTrabajo.observaciones,
      clienteConforme: ordenTrabajo.clienteConforme,
      createdAt: ordenTrabajo.createdAt
    })
    .from(ordenTrabajo)
    .leftJoin(clientes, eq(ordenTrabajo.clienteId, clientes.id))
    .where(eq(ordenTrabajo.nroOt, id))
    .get()

  if (!ot) throw createError({ statusCode: 404, message: 'Orden de trabajo no encontrada' })

  const otMaquinasList = db
    .select({ id: maquinas.id, nombre: maquinas.nombre })
    .from(otMaquinas)
    .innerJoin(maquinas, eq(otMaquinas.maquinaId, maquinas.id))
    .where(eq(otMaquinas.otId, id))
    .all()

  const otMateriales = db
    .select({
      id: materiales.id,
      otId: materiales.otId,
      materialId: materiales.materialId,
      materialNombre: catalogoMateriales.nombre,
      unidad: catalogoMateriales.unidad,
      fecha: materiales.fecha,
      proveedor: materiales.proveedor,
      cantidad: materiales.cantidad,
      problemas: materiales.problemas
    })
    .from(materiales)
    .leftJoin(catalogoMateriales, eq(materiales.materialId, catalogoMateriales.id))
    .where(eq(materiales.otId, id))
    .all()

  const archivos = db
    .select({
      id: otArchivos.id,
      otId: otArchivos.otId,
      bibliotecaId: otArchivos.bibliotecaId,
      nombre: bibliotecaArchivos.nombre,
      archivo: bibliotecaArchivos.archivo,
      tipo: bibliotecaArchivos.tipo,
      createdAt: bibliotecaArchivos.createdAt
    })
    .from(otArchivos)
    .leftJoin(bibliotecaArchivos, eq(otArchivos.bibliotecaId, bibliotecaArchivos.id))
    .where(eq(otArchivos.otId, id))
    .all()

  return { ...ot, maquinas: otMaquinasList, materiales: otMateriales, archivos }
})
