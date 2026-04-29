import { readFile } from 'fs/promises'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const filename = getRouterParam(event, 'filename')!

  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw createError({ statusCode: 400, message: 'Nombre de archivo inválido' })
  }

  const filepath = join(process.cwd(), 'uploads', 'library', filename)

  let buffer: Buffer
  try {
    buffer = await readFile(filepath)
  } catch {
    throw createError({ statusCode: 404, message: 'Archivo no encontrado' })
  }

  const ext = filename.split('.').pop()?.toLowerCase()
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    pdf: 'application/pdf'
  }
  const contentType = mimeMap[ext || ''] || 'application/octet-stream'

  setHeader(event, 'Content-Type', contentType)
  setHeader(event, 'Cache-Control', 'private, max-age=3600')
  return buffer
})
