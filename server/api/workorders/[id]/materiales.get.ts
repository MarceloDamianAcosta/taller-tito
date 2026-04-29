import { db } from '../../../db/index'
import { materiales, catalogoMateriales } from '../../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID inválido' })

  return db
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
})
