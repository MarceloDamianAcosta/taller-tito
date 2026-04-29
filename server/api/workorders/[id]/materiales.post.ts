import { db } from '../../../db/index'
import { materiales, catalogoMateriales } from '../../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'ID inválido' })

  const body = await readBody(event)
  const items = Array.isArray(body) ? body : [body]

  if (!items.length) throw createError({ statusCode: 400, message: 'Se requiere al menos un material' })

  for (const item of items) {
    if (!item.material_id) throw createError({ statusCode: 400, message: 'material_id es obligatorio' })
    if (!item.fecha) throw createError({ statusCode: 400, message: 'La fecha es obligatoria' })
    if (!item.proveedor) throw createError({ statusCode: 400, message: 'El proveedor es obligatorio' })
    if (item.cantidad === undefined || item.cantidad === null) throw createError({ statusCode: 400, message: 'La cantidad es obligatoria' })
  }

  const values = items.map(item => ({
    otId: id,
    materialId: Number(item.material_id),
    fecha: item.fecha,
    proveedor: item.proveedor,
    cantidad: Number(item.cantidad),
    problemas: item.problemas || null
  }))

  db.insert(materiales).values(values).run()

  const inserted = db
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

  return inserted
})
