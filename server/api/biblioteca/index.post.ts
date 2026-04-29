import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { db } from '../../db/index'
import { bibliotecaArchivos } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const formData = await readFormData(event)
  const file = formData.get('archivo') as File
  const nombre = formData.get('nombre') as string

  if (!file || !nombre) throw createError({ statusCode: 400, message: 'Datos incompletos' })
  if (!nombre.trim()) throw createError({ statusCode: 400, message: 'El nombre es obligatorio' })
  if (file.size > 10 * 1024 * 1024) throw createError({ statusCode: 400, message: 'Archivo demasiado grande (máx 10MB)' })

  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
  if (!allowedTypes.includes(file.type)) {
    throw createError({ statusCode: 400, message: 'Tipo de archivo no permitido' })
  }

  const uploadsDir = join(process.cwd(), 'uploads', 'library')
  await mkdir(uploadsDir, { recursive: true })

  const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filename = `${Date.now()}_${safeFilename}`
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(join(uploadsDir, filename), buffer)

  const tipo = file.type === 'application/pdf' ? 'pdf' : 'imagen'
  const record = db.insert(bibliotecaArchivos).values({ nombre: nombre.trim(), archivo: filename, tipo }).returning().get()
  return record
})
